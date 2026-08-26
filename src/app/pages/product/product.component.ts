import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { Product } from '../../model/product';
import { Category } from '../../model/category';

/**
 * Administracion de la carta. Existe sobre todo para cargar los precios:
 * el catalogo se sembro en S/ 0.00 porque la carta original no los traia.
 */
@Component({
  selector: 'app-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product.component.html',
  styleUrl: './product.component.css',
})
export class ProductComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);

  products: Product[] = [];
  categories: Category[] = [];
  categoryFilter: number | 'ALL' = 'ALL';

  loading = true;
  errorMessage = '';
  savingId: number | null = null;
  savedId: number | null = null;

  /** Precio en edicion por producto, para no pisar la lista mientras se escribe. */
  priceDraft = new Map<number, string>();

  ngOnInit(): void {
    this.categoryService.findAllRaw().subscribe((data) => (this.categories = data));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.productService.findAllRaw().subscribe({
      next: (data) => {
        this.products = data;
        this.priceDraft.clear();
        for (const p of data) {
          if (p.idProduct != null) this.priceDraft.set(p.idProduct, p.price.toFixed(2));
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudieron cargar los productos.';
        this.loading = false;
      },
    });
  }

  get visibleProducts(): Product[] {
    if (this.categoryFilter === 'ALL') return this.products;
    return this.products.filter((p) => p.category.idCategory === this.categoryFilter);
  }

  get pendingPriceCount(): number {
    return this.products.filter((p) => p.active !== false && p.price <= 0).length;
  }

  savePrice(product: Product): void {
    const id = product.idProduct;
    if (id == null) return;

    const raw = (this.priceDraft.get(id) ?? '').replace(',', '.');
    const price = Number(raw);

    if (!isFinite(price) || price <= 0) {
      this.errorMessage = `"${product.name}": el precio debe ser mayor a 0.`;
      return;
    }

    this.errorMessage = '';
    this.savingId = id;
    this.productService.updatePrice(id, price).subscribe({
      next: (updated) => {
        product.price = updated.price;
        this.priceDraft.set(id, updated.price.toFixed(2));
        this.savingId = null;
        this.savedId = id;
        setTimeout(() => (this.savedId === id ? (this.savedId = null) : null), 2000);
      },
      error: (err) => {
        this.errorMessage = err?.message || `No se pudo actualizar el precio de "${product.name}".`;
        this.savingId = null;
      },
    });
  }

  toggleActive(product: Product): void {
    const id = product.idProduct;
    if (id == null) return;

    // El backend exige precio > 0 al guardar el producto completo.
    if (product.price <= 0) {
      this.errorMessage = `"${product.name}": asigna un precio antes de activarlo.`;
      return;
    }

    this.errorMessage = '';
    this.savingId = id;
    this.productService.update(id, { ...product, active: !product.active }).subscribe({
      next: (updated) => {
        product.active = updated.active;
        this.savingId = null;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudo cambiar el estado del producto.';
        this.savingId = null;
      },
    });
  }
}
