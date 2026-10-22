import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DiningTableService } from '../../../services/dining-table.service';
import { CategoryService } from '../../../services/category.service';
import { ProductService } from '../../../services/product.service';
import { OrderService } from '../../../services/order.service';
import { AuthService } from '../../../services/auth.service';
import { ClientService } from '../../../services/client.service';
import { PrinterService } from '../../../services/printer.service';
import { DiningTable } from '../../../model/dining-table';
import { Category } from '../../../model/category';
import { Product } from '../../../model/product';
import { Flavor } from '../../../model/flavor';
import { Order } from '../../../model/order';
import { OrderDetail } from '../../../model/order-detail';
import { OrderCreateRequest } from '../../../model/order-create-request';
import { Client } from '../../../model/client';
import { CheckoutModalComponent } from './checkout-modal/checkout-modal.component';
import { FlavorModalComponent } from '../../shared/flavor-modal/flavor-modal.component';
import { PinPadComponent } from '../../shared/pin-pad/pin-pad.component';
import { StationModalComponent, areasOf, DishOption, toDishOptions } from '../../shared/station-modal/station-modal.component';
import { ClientModalComponent } from '../../shared/client-modal/client-modal.component';
import { KitchenStation } from '../../../model/enums';

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
    StationModalComponent,
    ClientModalComponent,
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
  public authService = inject(AuthService);
  private clientService = inject(ClientService);
  private printerService = inject(PrinterService);

  table: DiningTable | null = null;
  categories: Category[] = [];
  allProducts: Product[] = [];
  products: Product[] = [];
  selectedCategory: Category | null = null;
  productCounts: Record<number, number> = {};

  currentOrder: Order | null = null;
  draftCart: CartLine[] = [];

  sending = false;
  errorMessage = '';
  feedbackMessage = '';
  showCheckout = false;

  // Cliente y modal
  selectedClient: Client | null = null;
  showClientModal = false;

  // Toggle por posición (conmutador en la cabecera)
  byPosition = false;

  // Vista activa en móvil (carta vs comanda)
  mobileView: 'catalog' | 'order' = 'catalog';

  get totalItemsCount(): number {
    const sentCount = this.currentOrder?.details?.reduce((sum, d) => sum + (d.quantity || 1), 0) ?? 0;
    const draftCount = this.draftCart.reduce((sum, l) => sum + l.quantity, 0);
    return sentCount + draftCount;
  }

  setMobileView(view: 'catalog' | 'order'): void {
    this.mobileView = view;
  }

  // Pestañas del catálogo derecho
  activeTab: 'categoria' | 'menu' | 'busqueda' | 'favoritos' = 'categoria';
  searchQuery = '';
  searchResults: Product[] = [];
  favoriteProducts: Product[] = [];

  // Toggle de detalle por fila (Ver detalle)
  expandedDetails = new Set<number>();

  /** Producto esperando que el mesero elija su sabor. */
  pendingFlavorProduct: Product | null = null;
  /** Producto esperando que se elija el plato al que acompana. */
  pendingStationProduct: Product | null = null;
  /** Platos que se le ofrecen para elegir. */
  stationDishes: DishOption[] = [];
  /** Sabor ya elegido, guardado mientras se elige tambien el area. */
  private pendingStationFlavor?: Flavor;

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

  get canCharge(): boolean {
    return CASHIER_ROLES.includes(this.authService.roleName().toUpperCase());
  }

  get currentWaiterName(): string {
    const user = this.authService.currentUser();
    return user?.fullName || user?.username || 'Luis Subero';
  }

  loadActiveOrder(idTable: number): void {
    this.orderService.findActiveOrderForTable(idTable).subscribe({
      next: (order) => {
        this.currentOrder = order;
        this.errorMessage = '';
        if (order?.client) {
          this.selectedClient = order.client;
        }
      },
      error: (err) => {
        this.currentOrder = null;
        this.errorMessage = err?.message || 'No se pudo cargar el pedido de esta mesa. Intenta recargar la pagina.';
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

  // --- Detalle desplegable de fila ---
  toggleDetail(id: number | undefined): void {
    if (!id) return;
    if (this.expandedDetails.has(id)) {
      this.expandedDetails.delete(id);
    } else {
      this.expandedDetails.add(id);
    }
  }

  isDetailExpanded(id: number | undefined): boolean {
    return id ? this.expandedDetails.has(id) : false;
  }

  addToCart(product: Product): void {
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

  /** Platos del pedido a los que puede acompanar un adicional */
  private get dishOptions(): DishOption[] {
    return toDishOptions([
      ...(this.currentOrder?.details ?? []).map((d) => ({
        name: d.productName,
        station: d.station ?? d.productStation,
      })),
      ...this.draftCart.map((l) => ({
        name: l.product.name,
        station: l.station ?? l.product.station,
      })),
    ]);
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
    const line = this.draftCart.find(
      (l) =>
        l.product.idProduct === product.idProduct &&
        l.flavor?.idFlavor === flavor?.idFlavor &&
        l.station === station
    );
    if (line) {
      line.quantity++;
      return;
    }
    this.draftCart.push({
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
      this.draftCart = this.draftCart.filter((l) => l !== line);
    }
  }

  get draftTotal(): number {
    return this.draftCart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  }

  get grandTotal(): number {
    return (this.currentOrder?.total ?? 0) + this.draftTotal;
  }

  get hasAnyItems(): boolean {
    return (
      (this.currentOrder?.details && this.currentOrder.details.length > 0) ||
      this.draftCart.length > 0
    );
  }

  sendOrder(): void {
    if (!this.table?.idTable || this.draftCart.length === 0) return;

    this.sending = true;
    this.errorMessage = '';
    this.feedbackMessage = '';

    const items = this.draftCart.map((l) => ({
      idProduct: l.product.idProduct!,
      quantity: l.quantity,
      idFlavor: l.flavor?.idFlavor,
      flavorName: l.flavor?.name,
      station: l.station,
    }));

    if (this.currentOrder?.idOrder) {
      this.orderService.addItems(this.currentOrder.idOrder, items).subscribe({
        next: (order) => {
          this.currentOrder = order;
          this.draftCart = [];
          this.sending = false;
          this.feedbackMessage = '¡Pedido enviado a cocina!';
          setTimeout(() => (this.feedbackMessage = ''), 3500);
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
      idClient: this.selectedClient?.idClient,
      items,
    };

    this.orderService.createOrder(request).subscribe({
      next: (order) => {
        this.currentOrder = order;
        this.draftCart = [];
        this.sending = false;
        this.feedbackMessage = '¡Pedido creado y enviado a cocina!';
        setTimeout(() => (this.feedbackMessage = ''), 3500);
      },
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudo enviar el pedido.';
        this.sending = false;
      },
    });
  }

  // --- Botones de la barra inferior (Precuenta y Despacho) ---
  printPreAccount(): void {
    if (!this.currentOrder?.idOrder) {
      this.errorMessage = 'No hay un pedido confirmado en esta mesa para generar la precuenta.';
      setTimeout(() => (this.errorMessage = ''), 4000);
      return;
    }

    this.feedbackMessage = 'Imprimiendo precuenta...';
    this.printerService.printPreAccount(this.currentOrder.idOrder).subscribe({
      next: () => {
        this.feedbackMessage = 'Precuenta impresa con éxito.';
        setTimeout(() => (this.feedbackMessage = ''), 3500);
      },
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudo imprimir la precuenta.';
        setTimeout(() => (this.errorMessage = ''), 4000);
      },
    });
  }

  despacho(): void {
    if (this.draftCart.length > 0) {
      this.sendOrder();
    } else if (this.currentOrder?.idOrder) {
      this.feedbackMessage = 'Reenviando comanda a la estación...';
      this.printerService.printKitchen(this.currentOrder.idOrder).subscribe({
        next: () => {
          this.feedbackMessage = 'Comanda despachada a cocina.';
          setTimeout(() => (this.feedbackMessage = ''), 3500);
        },
        error: (err) => {
          this.errorMessage = err?.message || 'No se pudo despachar a la impresora de cocina.';
          setTimeout(() => (this.errorMessage = ''), 4000);
        },
      });
    } else {
      this.errorMessage = 'Agrega productos antes de despachar.';
      setTimeout(() => (this.errorMessage = ''), 3000);
    }
  }

  // ===================== Corregir un pedido ya enviado =====================
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
    // El pago se registro
  }
}
