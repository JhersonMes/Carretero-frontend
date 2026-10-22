import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { CashShiftService } from '../../services/cash-shift.service';
import { PaymentMethodService } from '../../services/payment-method.service';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { ClientService } from '../../services/client.service';
import { PrinterService } from '../../services/printer.service';
import { Category } from '../../model/category';
import { Product } from '../../model/product';
import { Flavor } from '../../model/flavor';
import { CashShift } from '../../model/cash-shift';
import { Order } from '../../model/order';
import { PaymentMethod } from '../../model/payment-method';
import { OrderCreateRequest } from '../../model/order-create-request';
import { Client } from '../../model/client';
import { FlavorModalComponent } from '../shared/flavor-modal/flavor-modal.component';
import { StationModalComponent, areasOf, DishOption, toDishOptions } from '../shared/station-modal/station-modal.component';
import { ClientModalComponent } from '../shared/client-modal/client-modal.component';
import { KitchenStation } from '../../model/enums';

interface CartLine {
  product: Product;
  quantity: number;
  /** Opcion elegida; dos lineas del mismo producto con distinta opcion no se agrupan. */
  flavor?: Flavor;
  /** Area elegida para esta linea, cuando el producto no la trae fija. */
  station?: KitchenStation;
  /** Precio unitario ya con el ajuste de la opcion aplicado. */
  unitPrice: number;
}

@Component({
  selector: 'app-quick-sale',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    FlavorModalComponent,
    StationModalComponent,
    ClientModalComponent,
  ],
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
  public authService = inject(AuthService);
  private clientService = inject(ClientService);
  private printerService = inject(PrinterService);

  categories: Category[] = [];
  allProducts: Product[] = [];
  products: Product[] = [];
  selectedCategory: Category | null = null;
  productCounts: Record<number, number> = {};
  cart: CartLine[] = [];

  activeShift: CashShift | null = null;
  checkingShift = true;

  paymentMethods: PaymentMethod[] = [];
  selectedMethodId: number | null = null;

  // Cliente y modal
  selectedClient: Client | null = null;
  showClientModal = false;

  // Vista activa en móvil (carta vs pedido rápido)
  mobileView: 'catalog' | 'order' = 'catalog';

  get totalItemsCount(): number {
    return this.cart.reduce((sum, l) => sum + l.quantity, 0);
  }

  setMobileView(view: 'catalog' | 'order'): void {
    this.mobileView = view;
  }

  // Pestañas del catálogo
  activeTab: 'categoria' | 'menu' | 'busqueda' | 'favoritos' = 'categoria';
  searchQuery = '';
  searchResults: Product[] = [];
  favoriteProducts: Product[] = [];

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
  /** Producto esperando que se elija el plato al que acompana. */
  pendingStationProduct: Product | null = null;
  /** Platos que se le ofrecen para elegir. */
  stationDishes: DishOption[] = [];
  /** Sabor ya elegido, guardado mientras se elige tambien el area. */
  private pendingStationFlavor?: Flavor;

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

    this.loadAllProducts();
  }

  loadAllProducts(): void {
    this.productService.findAll().subscribe({
      next: (all) => {
        this.allProducts = all;
        this.productCounts = {};
        all.forEach((p) => {
          const cid = p.category?.idCategory;
          if (cid) {
            this.productCounts[cid] = (this.productCounts[cid] || 0) + 1;
          }
        });
        this.favoriteProducts = all.slice(0, 12);
        this.onSearchChange();
      },
      error: () => {},
    });
  }

  get cashierName(): string {
    const shiftUser = this.activeShift?.user;
    const currentUser = this.authService.currentUser();
    return shiftUser?.fullName || currentUser?.fullName || currentUser?.username || 'Caja Para Llevar Principal';
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

  // --- Navegación entre pestañas ---
  setTab(tab: 'categoria' | 'menu' | 'busqueda' | 'favoritos'): void {
    this.activeTab = tab;
  }

  selectCategoryAndOpenMenu(category: Category): void {
    this.selectCategory(category);
    this.activeTab = 'menu';
  }

  selectCategory(category: Category): void {
    this.selectedCategory = category;
    if (!category.idCategory) return;
    this.productService.findByCategory(category.idCategory).subscribe((data) => {
      this.products = data;
    });
  }

  onSearchChange(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.searchResults = this.allProducts.slice(0, 24);
      return;
    }
    this.searchResults = this.allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q))
    );
  }

  // --- Cliente ---
  openClientModal(): void {
    this.showClientModal = true;
  }

  closeClientModal(): void {
    this.showClientModal = false;
  }

  onClientSelected(client: Client | null): void {
    this.selectedClient = client;
    this.closeClientModal();
  }

  addToCart(product: Product): void {
    this.successMessage = '';
    if (product.requiresFlavor) {
      this.pendingFlavorProduct = product;
      return;
    }
    if (product.requiresStation) {
      this.askStation(product);
      return;
    }
    this.pushToCart(product);
  }

  /** Platos del carrito a los que puede acompanar un adicional. */
  private get dishOptions(): DishOption[] {
    return toDishOptions(
      this.cart.map((l) => ({ name: l.product.name, station: l.station ?? l.product.station }))
    );
  }

  private askStation(product: Product, flavor?: Flavor): void {
    const dishes = this.dishOptions;
    const areas = areasOf(dishes);

    if (areas.length === 1) {
      this.pushToCart(product, flavor, areas[0]);
      return;
    }

    this.stationDishes = dishes;
    this.pendingStationProduct = product;
    this.pendingStationFlavor = flavor;
  }

  onFlavorChosen(flavor: Flavor): void {
    const product = this.pendingFlavorProduct;
    this.pendingFlavorProduct = null;
    if (!product) return;

    if (product.requiresStation) {
      this.askStation(product, flavor);
      return;
    }
    this.pushToCart(product, flavor);
  }

  onFlavorCancelled(): void {
    this.pendingFlavorProduct = null;
  }

  onStationChosen(station: KitchenStation): void {
    const product = this.pendingStationProduct;
    const flavor = this.pendingStationFlavor;
    this.pendingStationProduct = null;
    this.pendingStationFlavor = undefined;
    if (product) this.pushToCart(product, flavor, station);
  }

  onStationCancelled(): void {
    this.pendingStationProduct = null;
    this.pendingStationFlavor = undefined;
  }

  private pushToCart(product: Product, flavor?: Flavor, station?: KitchenStation): void {
    const line = this.cart.find(
      (l) =>
        l.product.idProduct === product.idProduct &&
        l.flavor?.idFlavor === flavor?.idFlavor &&
        l.station === station
    );
    if (line) {
      line.quantity++;
      return;
    }
    this.cart.push({
      product,
      quantity: 1,
      flavor,
      station,
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
    return this.pendingPaymentOrder !== null || this.cart.length > 0;
  }

  get sendLabel(): string {
    if (this.sending) return 'Cobrando...';
    return this.pendingPaymentOrder ? 'Reintentar cobro' : 'PAGAR';
  }

  sendOrder(): void {
    if (!this.activeShift) {
      this.errorMessage = 'Debes aperturar la caja antes de enviar pedidos.';
      return;
    }
    if (!this.selectedMethodId) {
      this.errorMessage = 'Elige el método de pago con el que cobras.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (this.pendingPaymentOrder) {
      this.sending = true;
      this.collect(this.pendingPaymentOrder);
      return;
    }

    if (this.cart.length === 0) return;

    this.sending = true;

    const request: OrderCreateRequest = {
      saleType: 'VENTA_RAPIDA',
      idClient: this.selectedClient?.idClient,
      items: this.cart.map((l) => ({
        idProduct: l.product.idProduct!,
        quantity: l.quantity,
        idFlavor: l.flavor?.idFlavor,
        flavorName: l.flavor?.name,
        station: l.station,
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

  private collect(order: Order): void {
    if (!order.idOrder) {
      this.errorMessage = 'El pedido se creó sin identificador y no se pudo cobrar.';
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
          this.successMessage = `¡Pedido ${order.orderCode} cobrado con éxito! Total: S/ ${amount.toFixed(2)}`;
          this.cart = [];
          this.pendingPaymentOrder = null;
          this.sending = false;
          this.loadShiftStatus();
        },
        error: (err) => {
          this.pendingPaymentOrder = order;
          this.cart = [];
          this.errorMessage =
            `El pedido ${order.orderCode} se envió a la estación pero no se pudo cobrar ` +
            `(${err?.message || 'error al registrar el pago'}). Reintenta el cobro.`;
          this.sending = false;
        },
      });
  }
}
