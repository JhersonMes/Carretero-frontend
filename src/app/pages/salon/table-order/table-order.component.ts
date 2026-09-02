import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DiningTableService } from '../../../services/dining-table.service';
import { CategoryService } from '../../../services/category.service';
import { ProductService } from '../../../services/product.service';
import { OrderService } from '../../../services/order.service';
import { AuthService } from '../../../services/auth.service';
import { DiningTable } from '../../../model/dining-table';
import { Category } from '../../../model/category';
import { Product } from '../../../model/product';
import { Flavor } from '../../../model/flavor';
import { Order } from '../../../model/order';
import { OrderDetail } from '../../../model/order-detail';
import { OrderCreateRequest } from '../../../model/order-create-request';
import { CheckoutModalComponent } from './checkout-modal/checkout-modal.component';
import { FlavorModalComponent } from '../../shared/flavor-modal/flavor-modal.component';
import { PinPadComponent } from '../../shared/pin-pad/pin-pad.component';

interface CartLine {
  product: Product;
  quantity: number;
  /** Opcion elegida; dos lineas del mismo producto con distinta opcion no se agrupan. */
  flavor?: Flavor;
  /** Precio unitario ya con el ajuste de la opcion aplicado. */
  unitPrice: number;
}

const CASHIER_ROLES = ['MESERO', 'CAJERO', 'ADMIN'];

@Component({
  selector: 'app-table-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CheckoutModalComponent,
    FlavorModalComponent,
    PinPadComponent,
  ],
  templateUrl: './table-order.component.html',
  styleUrl: './table-order.component.css',
})
export class TableOrderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tableService = inject(DiningTableService);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private orderService = inject(OrderService);
  private authService = inject(AuthService);

  table: DiningTable | null = null;
  categories: Category[] = [];
  products: Product[] = [];
  selectedCategory: Category | null = null;

  currentOrder: Order | null = null;
  draftCart: CartLine[] = [];

  sending = false;
  errorMessage = '';
  showCheckout = false;

  /** Producto esperando que el mesero elija su sabor. */
  pendingFlavorProduct: Product | null = null;

  /** Plato que se quiere quitar; mientras no sea null se pide el PIN. */
  itemToRemove: OrderDetail | null = null;
  /** Plato al que se le esta escribiendo la nota. */
  itemToNote: OrderDetail | null = null;
  noteDraft = '';
  savingNote = false;
  /** true mientras se pide el PIN para anular el pedido entero. */
  cancellingOrder = false;
  itemError = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.tableService.findById(id).subscribe((t) => (this.table = t));
      this.loadActiveOrder(id);
    }

    this.categoryService.findAllActive().subscribe((data) => {
      this.categories = data;
      if (data.length > 0) {
        this.selectCategory(data[0]);
      }
    });
  }

  get canCharge(): boolean {
    return CASHIER_ROLES.includes(this.authService.roleName().toUpperCase());
  }

  loadActiveOrder(idTable: number): void {
    this.orderService.findActiveOrderForTable(idTable).subscribe({
      next: (order) => {
        this.currentOrder = order;
        this.errorMessage = '';
      },
      error: (err) => {
        this.currentOrder = null;
        this.errorMessage = err?.message || 'No se pudo cargar el pedido de esta mesa. Intenta recargar la pagina.';
      },
    });
  }

  selectCategory(category: Category): void {
    this.selectedCategory = category;
    if (!category.idCategory) return;
    this.productService.findByCategory(category.idCategory).subscribe((data) => {
      this.products = data;
    });
  }

  addToCart(product: Product): void {
    if (product.requiresFlavor) {
      this.pendingFlavorProduct = product;
      return;
    }
    this.pushToCart(product);
  }

  onFlavorChosen(flavor: Flavor): void {
    if (this.pendingFlavorProduct) {
      this.pushToCart(this.pendingFlavorProduct, flavor);
    }
    this.pendingFlavorProduct = null;
  }

  onFlavorCancelled(): void {
    this.pendingFlavorProduct = null;
  }

  private pushToCart(product: Product, flavor?: Flavor): void {
    const line = this.draftCart.find(
      (l) => l.product.idProduct === product.idProduct && l.flavor?.idFlavor === flavor?.idFlavor
    );
    if (line) {
      line.quantity++;
      return;
    }
    this.draftCart.push({
      product,
      quantity: 1,
      flavor,
      unitPrice: product.price + (flavor?.priceDelta ?? 0),
    });
  }

  incrementLine(line: CartLine): void {
    line.quantity++;
  }

  decrementLine(line: CartLine): void {
    line.quantity--;
    if (line.quantity <= 0) {
      this.draftCart = this.draftCart.filter((l) => l !== line);
    }
  }

  get draftTotal(): number {
    return this.draftCart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  }

  get grandTotal(): number {
    return (this.currentOrder?.total ?? 0) + this.draftTotal;
  }

  sendOrder(): void {
    if (!this.table?.idTable || this.draftCart.length === 0) return;

    this.sending = true;
    this.errorMessage = '';
    const items = this.draftCart.map((l) => ({
      idProduct: l.product.idProduct!,
      quantity: l.quantity,
      idFlavor: l.flavor?.idFlavor,
      flavorName: l.flavor?.name,
    }));

    if (this.currentOrder?.idOrder) {
      this.orderService.addItems(this.currentOrder.idOrder, items).subscribe({
        next: (order) => {
          this.currentOrder = order;
          this.draftCart = [];
          this.sending = false;
        },
        error: (err) => {
          this.errorMessage = err?.message || 'No se pudo enviar el pedido.';
          this.sending = false;
        },
      });
      return;
    }

    const request: OrderCreateRequest = {
      saleType: 'SALON',
      idTable: this.table.idTable,
      items,
    };

    this.orderService.createOrder(request).subscribe({
      next: (order) => {
        this.currentOrder = order;
        this.draftCart = [];
        this.sending = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudo enviar el pedido.';
        this.sending = false;
      },
    });
  }

  // ===================== Corregir un pedido ya enviado =====================

  /**
   * Quitar un plato pide PIN; cambiarle la nota no.
   *
   * El PIN protege lo que baja la cuenta: el plato pudo haberse cocinado ya y
   * quitarlo le resta plata a la mesa. Una nota ("sin aji") no mueve el monto y
   * suele ser justo lo que hay que corregir a ultimo momento, asi que pedirle un
   * PIN al mesero solo lo entorpeceria.
   */
  askRemoveItem(detail: OrderDetail): void {
    this.itemToRemove = detail;
    this.itemError = '';
  }

  cancelRemoveItem(): void {
    this.itemToRemove = null;
  }

  get removeSubtitle(): string {
    const d = this.itemToRemove;
    if (!d) return '';
    return `Quitar ${d.quantity}x ${d.productName} - S/ ${Number(d.subtotal ?? 0).toFixed(2)}`;
  }

  onRemoveAuthorized(pin: string): void {
    const detail = this.itemToRemove;
    if (!detail?.idOrderDetail) return;

    this.itemToRemove = null;
    this.itemError = '';
    this.orderService.removeItem(detail.idOrderDetail, pin).subscribe({
      // El backend devuelve el pedido ya recalculado: el total baja solo.
      next: (order) => (this.currentOrder = order),
      error: (err) => {
        this.itemError = (err as { message?: string })?.message || 'No se pudo quitar el plato.';
      },
    });
  }

  startEditNote(detail: OrderDetail): void {
    this.itemToNote = detail;
    this.noteDraft = detail.notes ?? '';
    this.itemError = '';
  }

  cancelEditNote(): void {
    this.itemToNote = null;
    this.noteDraft = '';
  }

  saveNote(): void {
    const detail = this.itemToNote;
    if (!detail?.idOrderDetail) return;

    this.savingNote = true;
    this.orderService.updateItemNotes(detail.idOrderDetail, this.noteDraft).subscribe({
      next: (updated) => {
        detail.notes = updated.notes;
        this.savingNote = false;
        this.cancelEditNote();
      },
      error: (err) => {
        this.savingNote = false;
        this.itemError = (err as { message?: string })?.message || 'No se pudo guardar la nota.';
      },
    });
  }

  // --- Anular el pedido completo ---

  askCancelOrder(): void {
    this.cancellingOrder = true;
    this.itemError = '';
  }

  cancelCancelOrder(): void {
    this.cancellingOrder = false;
  }

  get cancelSubtitle(): string {
    return `Anular ${this.currentOrder?.orderCode ?? ''} - S/ ${Number(
      this.currentOrder?.total ?? 0
    ).toFixed(2)}`;
  }

  onCancelAuthorized(pin: string): void {
    const idOrder = this.currentOrder?.idOrder;
    if (!idOrder) return;

    this.cancellingOrder = false;
    this.orderService.cancelOrder(idOrder, pin, 'Anulado desde Salon').subscribe({
      // Anular libera la mesa, asi que ya no hay nada que atender aqui.
      next: () => this.router.navigate(['/pages/salon']),
      error: (err) => {
        this.itemError = (err as { message?: string })?.message || 'No se pudo anular el pedido.';
      },
    });
  }

  openCheckout(): void {
    this.showCheckout = true;
  }

  closeCheckout(): void {
    this.showCheckout = false;
    if (!this.table?.idTable) return;

    this.orderService.findActiveOrderForTable(this.table.idTable).subscribe({
      next: (order) => {
        this.currentOrder = order;
        this.errorMessage = '';
        if (!order) {
          this.router.navigate(['/pages/salon']);
        }
      },
      error: (err) => {
        this.currentOrder = null;
        this.errorMessage = err?.message || 'No se pudo actualizar el pedido de esta mesa.';
      },
    });
  }

  onPaid(): void {
    // El pago se registro; se espera a que el usuario cierre el modal (boton "Listo")
    // para que pueda ver el numero de comprobante antes de volver al Salon.
  }
}
