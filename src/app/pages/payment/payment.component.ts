import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { PaymentService } from '../../services/payment.service';
import { Payment } from '../../model/payment';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './payment.component.html'
})
export class PaymentComponent implements OnInit {
  private paymentService = inject(PaymentService);
  payments: Payment[] = [];

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.paymentService.findAll().subscribe((data) => {
      this.payments = data;
    });
  }

  deletePayment(id: number): void {
    if (confirm('¿Está seguro de eliminar este registro de pago?')) {
      this.paymentService.delete(id).subscribe(() => this.loadPayments());
    }
  }
}
