import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentMethodService } from '../../../../services/payment-method.service';
import { PaymentService } from '../../../../services/payment.service';
import { InvoiceService } from '../../../../services/invoice.service';
import { PaymentMethod } from '../../../../model/payment-method';
import { Order } from '../../../../model/order';
import { InvoiceType, DocumentType } from '../../../../model/enums';
import { PaymentCreateRequest } from '../../../../model/payment-create-request';
import { InvoiceEmitRequest } from '../../../../model/invoice-emit-request';

interface PaymentLine {
  idPaymentMethod: number | null;
  amount: number;
}

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout-modal.component.html',
  styleUrl: './checkout-modal.component.css',
})
export class CheckoutModalComponent implements OnInit {
  private paymentMethodService = inject(PaymentMethodService);
  private paymentService = inject(PaymentService);
  private invoiceService = inject(InvoiceService);

  @Input({ required: true }) order!: Order;
  @Output() closed = new EventEmitter<void>();
  @Output() paid = new EventEmitter<void>();

  paymentMethods: PaymentMethod[] = [];
  selectedDetailIds = new Set<number>();
  paymentLines: PaymentLine[] = [{ idPaymentMethod: null, amount: 0 }];
  splitMode = false;

  invoiceType: InvoiceType = 'BOLETA';
  docNumber = '';
  clientName = '';

  alreadyPaid = 0;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  fullyPaid = false;

  ngOnInit(): void {
    this.paymentMethodService.findAll().subscribe((methods) => {
      this.paymentMethods = methods;
      if (methods.length > 0 && this.paymentLines[0]) {
        this.paymentLines[0].idPaymentMethod = methods[0].idPaymentMethod;
      }
    });

    (this.order.details ?? []).forEach((d) => {
      if (d.idOrderDetail) this.selectedDetailIds.add(d.idOrderDetail);
    });

    this.loadAlreadyPaid();
    this.useSuggestedAmount();
  }

  private loadAlreadyPaid(): void {
    if (!this.order.idOrder) return;
    this.paymentService.findByOrder(this.order.idOrder).subscribe((payments) => {
      this.alreadyPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    });
  }

  toggleDetail(idOrderDetail: number | undefined): void {
    if (!idOrderDetail) return;
    if (this.selectedDetailIds.has(idOrderDetail)) {
      this.selectedDetailIds.delete(idOrderDetail);
    } else {
      this.selectedDetailIds.add(idOrderDetail);
    }
  }

  get selectedSubtotal(): number {
    return (this.order.details ?? [])
      .filter((d) => d.idOrderDetail && this.selectedDetailIds.has(d.idOrderDetail))
      .reduce((sum, d) => sum + (d.subtotal ?? 0), 0);
  }

  get remainingBalance(): number {
    return Math.max((this.order.total ?? 0) - this.alreadyPaid, 0);
  }

  get paymentLinesTotal(): number {
    return this.paymentLines.reduce((sum, l) => sum + (l.amount || 0), 0);
  }

  /** Monto sugerido: en modo dividir cuenta, lo seleccionado; si no, el saldo completo. */
  get targetAmount(): number {
    const target = this.splitMode ? this.selectedSubtotal : this.remainingBalance;
    return Math.min(target, this.remainingBalance);
  }

  /** Nunca se puede cobrar mas de lo que realmente falta pagar del pedido. */
  get overpaying(): boolean {
    return this.paymentLinesTotal > this.remainingBalance + 0.001;
  }

  toggleSplitMode(): void {
    this.splitMode = !this.splitMode;
    if (!this.splitMode) {
      this.selectedDetailIds.clear();
      (this.order.details ?? []).forEach((d) => {
        if (d.idOrderDetail) this.selectedDetailIds.add(d.idOrderDetail);
      });
    }
    this.useSuggestedAmount();
  }

  useSuggestedAmount(): void {
    if (this.paymentLines[0]) {
      this.paymentLines[0].amount = Math.round(this.targetAmount * 100) / 100;
    }
  }

  addPaymentLine(): void {
    this.paymentLines.push({
      idPaymentMethod: this.paymentMethods[0]?.idPaymentMethod ?? null,
      amount: 0,
    });
  }

  removePaymentLine(line: PaymentLine): void {
    if (this.paymentLines.length <= 1) return;
    this.paymentLines = this.paymentLines.filter((l) => l !== line);
  }

  get showDocNumber(): boolean {
    return this.invoiceType === 'FACTURA' || this.invoiceType === 'BOLETA';
  }

  get docNumberLabel(): string {
    return this.invoiceType === 'FACTURA' ? 'RUC (11 digitos)' : 'DNI (opcional)';
  }

  private buildDocType(): DocumentType | undefined {
    if (this.invoiceType === 'FACTURA') return 'RUC';
    if (this.invoiceType === 'BOLETA' && this.docNumber) return 'DNI';
    return undefined;
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const validLines = this.paymentLines.filter((l) => l.idPaymentMethod && l.amount > 0);
    if (validLines.length === 0) {
      this.errorMessage = 'Ingresa al menos un monto valido con su metodo de pago.';
      return;
    }
    if (this.overpaying) {
      this.errorMessage = `El monto ingresado (S/ ${this.paymentLinesTotal.toFixed(2)}) supera el saldo pendiente (S/ ${this.remainingBalance.toFixed(2)}).`;
      return;
    }
    if (this.invoiceType === 'FACTURA' && this.docNumber.trim().length !== 11) {
      this.errorMessage = 'Para Factura, el RUC debe tener 11 digitos.';
      return;
    }
    if (!this.order.idOrder) return;

    this.submitting = true;

    const request: PaymentCreateRequest = {
      idOrder: this.order.idOrder,
      payments: validLines.map((l) => ({ idPaymentMethod: l.idPaymentMethod!, amount: l.amount })),
    };

    this.paymentService.registerPayments(request).subscribe({
      next: () => {
        const newAlreadyPaid = this.alreadyPaid + this.paymentLinesTotal;
        this.alreadyPaid = newAlreadyPaid;

        if (newAlreadyPaid + 0.001 >= (this.order.total ?? 0)) {
          this.fullyPaid = true;
          this.emitInvoiceIfNeeded();
        } else {
          this.submitting = false;
          this.successMessage = `Pago parcial registrado. Falta S/ ${this.remainingBalance.toFixed(2)} por cobrar.`;
          this.paymentLines = [{ idPaymentMethod: this.paymentMethods[0]?.idPaymentMethod ?? null, amount: 0 }];
        }
      },
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudo registrar el pago.';
        this.submitting = false;
      },
    });
  }

  private emitInvoiceIfNeeded(): void {
    if (!this.order.idOrder) return;

    const request: InvoiceEmitRequest = {
      idOrder: this.order.idOrder,
      invoiceType: this.invoiceType,
      docType: this.buildDocType(),
      docNumber: this.docNumber || undefined,
      clientName: this.clientName || undefined,
    };

    this.invoiceService.emitInvoice(request).subscribe({
      next: (invoice) => {
        this.successMessage = `Mesa cobrada y liberada. Comprobante ${invoice.fullNumber} emitido.`;
        this.submitting = false;
        this.paid.emit();
      },
      error: (err) => {
        this.errorMessage =
          (err?.message || 'No se pudo emitir el comprobante.') + ' El pago ya quedo registrado.';
        this.submitting = false;
        this.paid.emit();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
