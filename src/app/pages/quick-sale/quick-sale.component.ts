import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { CashShiftService } from '../../services/cash-shift.service';
import { Category } from '../../model/category';
import { Product } from '../../model/product';
import { Flavor } from '../../model/flavor';
import { CashShift } from '../../model/cash-shift';
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

  categories: Category[] = [];
  products: Product[] = [];
  selectedCategory: Category | null = null;
  cart: CartLine[] = [];

  activeShift: CashShift | null = null;
  checkingShift = true;

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
    return !this.checkingShift && !!this.activeShift && this.cart.length > 0 && !this.sending;
  }

  sendOrder(): void {
    if (!this.activeShift) {
      this.errorMessage = 'Debes aperturar la caja antes de enviar pedidos.';
      return;
    }
    if (this.cart.length === 0) return;

    this.sending = true;
    this.errorMessage = '';
    this.successMessage = '';

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
      next: (order) => {
        this.successMessage = `Pedido ${order.orderCode} enviado. Total: S/ ${(order.total ?? 0).toFixed(2)}`;
        this.cart = [];
        this.sending = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudo enviar el pedido.';
        this.sending = false;
      },
    });
  }
}
