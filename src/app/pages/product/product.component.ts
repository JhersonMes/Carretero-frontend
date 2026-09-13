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
  query = '';

  /** Unidades vendidas por producto; desempata las sugerencias del buscador. */
  private soldUnits: Record<string, number> = {};

  loading = true;
  errorMessage = '';
  savingId: number | null = null;
  savedId: number | null = null;

  /** Precio en edicion por producto, para no pisar la lista mientras se escribe. */
  priceDraft = new Map<number, string>();

  ngOnInit(): void {
    this.categoryService.findAllRaw().subscribe((data) => (this.categories = data));

    // Sin esto el buscador igual funciona: solo pierde el desempate por lo
    // vendido, asi que un fallo aqui no bloquea la pantalla.
    this.productService.getSoldUnits().subscribe({
      next: (data) => (this.soldUnits = data),
      error: () => (this.soldUnits = {}),
    });

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

  /**
   * Lo que se ve en la tabla: filtrado por categoria, por lo tecleado, y
   * ordenado por que tan bien calza cada producto con la busqueda.
   *
   * Se resuelve entero en el navegador. La carta son decenas de productos, no
   * miles: filtrar y ordenar esa lista es instantaneo, y hacerlo aqui evita
   * ir al servidor en cada tecla.
   */
  get visibleProducts(): Product[] {
    const byCategory =
      this.categoryFilter === 'ALL'
        ? this.products
        : this.products.filter((p) => p.category.idCategory === this.categoryFilter);

    const terms = this.normalize(this.query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return byCategory;

    return byCategory
      .map((product) => ({ product, score: this.scoreOf(product, terms) }))
      .filter((row) => row.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          this.soldUnitsOf(b.product) - this.soldUnitsOf(a.product) ||
          a.product.name.localeCompare(b.product.name)
      )
      .map((row) => row.product);
  }

  /**
   * Que tan bien calza un producto con lo tecleado.
   *
   * Pesa mas el nombre que la categoria, y dentro del nombre pesa mas empezar
   * por lo tecleado que contenerlo: quien escribe "ali" busca "Alitas", no
   * "Porcion familiar de alitas". Cada palabra tiene que aparecer en alguna
   * parte; si una no calza, el producto no es lo que se busca y queda fuera.
   *
   * A eso se le suma un empujon por lo vendido, que rompe los empates: entre
   * dos coincidencias igual de buenas primero va la que mas sale.
   */
  private scoreOf(product: Product, terms: string[]): number {
    const name = this.normalize(product.name);
    const category = this.normalize(product.category?.name ?? '');
    let score = 0;

    for (const term of terms) {
      if (name.startsWith(term)) score += 100;
      else if (new RegExp(`\\b${this.escapeRegex(term)}`).test(name)) score += 60;
      else if (name.includes(term)) score += 30;
      else if (category.includes(term)) score += 10;
      else return 0;
    }

    // Techo bajo a proposito: la popularidad ordena entre coincidencias
    // parecidas, no asciende a un producto que calza peor.
    return score + Math.min(this.soldUnitsOf(product), 25) / 26;
  }

  private soldUnitsOf(product: Product): number {
    return product.idProduct != null ? this.soldUnits[product.idProduct] ?? 0 : 0;
  }

  /**
   * Sin tildes ni mayusculas: "Porción" tiene que encontrarse tecleando
   * "porcion". El rango va escrito con escapes y no con los signos literales
   * porque son caracteres combinantes invisibles: en el codigo no se ven, y
   * cualquier herramienta que reescriba el archivo puede romperlos.
   */
  private normalize(value: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  clearQuery(): void {
    this.query = '';
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
