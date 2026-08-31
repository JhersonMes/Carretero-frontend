import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { CashShiftService } from '../../services/cash-shift.service';
import { PaymentMethodService } from '../../services/payment-method.service';
import { PaymentService } from '../../services/payment.service';
import { Category } from '../../model/category';
import { Product } from '../../model/product';
import { Flavor } from '../../model/flavor';
import { CashShift } from '../../model/cash-shift';
import { Order } from '../../model/order';
import { PaymentMethod } from '../../model/payment-method';
import { OrderCreateRequest } from '../../model/order-create-request';
import { FlavorModalComponent } from '../shared/flavor-modal/flavor-modal.component';

interface CartLine {
  product: Product;
  quantity: number;
  /** Opcion elegida; dos lineas del mismo producto con distinta opcion no se agrupan. */
  flavor?: Flavor;
  /** Precio unitario ya con el ajuste de la opcion aplicado. */
  unitPrice: number;
}

@Component({
  selector: 'app-quick-sale',
  standalone: true,
  imports: [CommonModule, RouterLink, FlavorModalComponent],
  templateUrl: './quick-sale.component.html',
  styleUrl: './quick-sale.component.css',
})
export class QuickSaleComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private orderService = inject(OrderService);
  private cashShiftService = inject(CashShiftService);
  private paymentMethodService = inject(PaymentMethodService);
  private paymentService = inject(PaymentService);

  categories: Category[] = [];
  products: Product[] = [];
  selectedCategory: Category | null = null;
  cart: CartLine[] = [];

  activeShift: CashShift | null = null;
  checkingShift = true;

  paymentMethods: PaymentMethod[] = [];
  selectedMethodId: number | null = null;

  /**
   * Pedido ya creado cuyo cobro fallo. Se guarda para reintentar solo el pago:
   * volver a pulsar el boton no debe generar un segundo pedido por lo mismo.
   */
  pendingPaymentOrder: Order | null = null;

  sending = false;
  successMessage = '';
  errorMessage = '';

  /** Producto esperando que se elija su sabor. */
  pendingFlavorProduct: Product | null = null;

  ngOnInit(): void {
    this.loadShiftStatus();

    this.categoryService.findAllActive().subscribe((data) => {
      this.categories = data;
      if (data.length > 0) {
        this.selectCategory(data[0]);
      }
    });

    this.paymentMethodService.findAll().subscribe((methods) => {
      this.paymentMethods = methods;
      this.selectedMethodId = methods[0]?.idPaymentMethod ?? null;
    });
  }

  selectMethod(method: PaymentMethod): void {
    this.selectedMethodId = method.idPaymentMethod;
  }

  loadShiftStatus(): void {
    this.checkingShift = true;
    this.cashShiftService.getActiveShift().subscribe({
      next: (shift) => {
        this.activeShift = shift;
        this.checkingShift = false;
      },
      error: () => {
        this.activeShift = null;
        this.checkingShift = false;
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
    this.successMessage = '';
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
    const line = this.cart.find(
      (l) => l.product.idProduct === product.idProduct && l.flavor?.idFlavor === flavor?.idFlavor
    );
    if (line) {
      line.quantity++;
      return;
    }
    this.cart.push({
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
      this.cart = this.cart.filter((l) => l !== line);
    }
  }

  get total(): number {
    return this.cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  }

  get canSend(): boolean {
    if (this.checkingShift || !this.activeShift || this.sending) return false;
    if (!this.selectedMethodId) return false;
    // Con un cobro pendiente de reintento no hace falta carrito: falta el pago.
    return this.pendingPaymentOrder !== null || this.cart.length > 0;
  }

  get sendLabel(): string {
    if (this.sending) return 'Cobrando...';
    return this.pendingPaymentOrder ? 'Reintentar cobro' : 'Cobrar y enviar';
  }

  /**
   * En venta rapida el cliente paga al pedir, asi que el pedido se crea y se cobra
   * en el mismo gesto. Sin el cobro, la venta no entraria en el arqueo: la caja
   * calcula sus totales desde los pagos registrados, no desde los pedidos.
   */
  sendOrder(): void {
    if (!this.activeShift) {
      this.errorMessage = 'Debes aperturar la caja antes de enviar pedidos.';
      return;
    }
    if (!this.selectedMethodId) {
      this.errorMessage = 'Elige el metodo de pago con el que cobras.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    // Un pedido que quedo sin cobrar solo necesita que se reintente el pago.
    if (this.pendingPaymentOrder) {
      this.sending = true;
      this.collect(this.pendingPaymentOrder);
      return;
    }

    if (this.cart.length === 0) return;

    this.sending = true;

    const request: OrderCreateRequest = {
      saleType: 'VENTA_RAPIDA',
      items: this.cart.map((l) => ({
        idProduct: l.product.idProduct!,
        quantity: l.quantity,
        idFlavor: l.flavor?.idFlavor,
        flavorName: l.flavor?.name,
      })),
    };

    this.orderService.createOrder(request).subscribe({
      next: (order) => this.collect(order),
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudo enviar el pedido.';
        this.sending = false;
      },
    });
  }

  /** Registra el pago del total. Al cubrirlo, el backend deja el pedido PAGADO. */
  private collect(order: Order): void {
    if (!order.idOrder) {
      this.errorMessage = 'El pedido se creo sin identificador y no se pudo cobrar.';
      this.sending = false;
      return;
    }

    const amount = Number(order.total ?? 0);

    this.paymentService
      .registerPayments({
        idOrder: order.idOrder,
        payments: [{ idPaymentMethod: this.selectedMethodId!, amount }],
      })
      .subscribe({
        next: () => {
          this.successMessage = `Pedido ${order.orderCode} cobrado. Total: S/ ${amount.toFixed(2)}`;
          this.cart = [];
          this.pendingPaymentOrder = null;
          this.sending = false;
          // El cobro mueve los totales de la caja: se refresca el turno en pantalla.
          this.loadShiftStatus();
        },
        error: (err) => {
          // El pedido ya existe y la comanda salio a la estacion; solo falto el
          // cobro. Se conserva para reintentarlo sin duplicar la venta.
          this.pendingPaymentOrder = order;
          this.cart = [];
          this.errorMessage =
            `El pedido ${order.orderCode} se envio a la estacion pero no se pudo cobrar ` +
            `(${err?.message || 'error al registrar el pago'}). Reintenta el cobro.`;
          this.sending = false;
        },
      });
  }
}
