import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';
import { FlavorService } from '../../services/flavor.service';
import { Category } from '../../model/category';
import { Product } from '../../model/product';
import { Flavor } from '../../model/flavor';
import { KitchenStation } from '../../model/enums';

const STATIONS: KitchenStation[] = ['COCINA', 'PARRILLA', 'BEBIDAS'];

/**
 * Administracion de la carta en tres niveles: categoria -> producto -> opciones.
 * Reemplaza la carga de datos por API: aqui se dan de alta los tipos nuevos.
 */
@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private flavorService = inject(FlavorService);

  readonly stations = STATIONS;

  categories: Category[] = [];
  products: Product[] = [];
  flavors: Flavor[] = [];

  selectedCategory: Category | null = null;
  selectedProduct: Product | null = null;

  /** true cuando las opciones mostradas vienen de la categoria y no del producto. */
  flavorsAreInherited = false;

  loadingCategories = true;
  loadingProducts = false;
  loadingFlavors = false;
  errorMessage = '';

  newCategory = this.blankCategory();
  newProduct = this.blankProduct();
  newFlavor = this.blankFlavor();

  ngOnInit(): void {
    this.loadCategories();
  }

  // ---------- Categorias ----------

  loadCategories(): void {
    this.loadingCategories = true;
    this.categoryService.findAllRaw().subscribe({
      next: (data) => {
        this.categories = data;
        this.loadingCategories = false;
        if (this.selectedCategory) {
          const still = data.find((c) => c.idCategory === this.selectedCategory!.idCategory);
          this.selectedCategory = still ?? null;
        }
      },
      error: (err) => this.fail(err, 'No se pudieron cargar las categorias.'),
    });
  }

  selectCategory(category: Category): void {
    this.selectedCategory = category;
    this.selectedProduct = null;
    this.flavors = [];
    this.newProduct = this.blankProduct();
    this.loadProducts();
  }

  createCategory(): void {
    if (!this.newCategory.name.trim()) {
      this.errorMessage = 'La categoria necesita un nombre.';
      return;
    }
    this.errorMessage = '';
    this.categoryService.save(this.newCategory).subscribe({
      next: () => {
        this.newCategory = this.blankCategory();
        this.loadCategories();
      },
      error: (err) => this.fail(err, 'No se pudo crear la categoria.'),
    });
  }

  toggleCategoryActive(category: Category): void {
    this.errorMessage = '';
    this.categoryService
      .update(category.idCategory!, { ...category, active: !category.active })
      .subscribe({
        next: (updated) => (category.active = updated.active),
        error: (err) => this.fail(err, 'No se pudo cambiar el estado de la categoria.'),
      });
  }

  deleteCategory(category: Category): void {
    if (!confirm(`Eliminar la categoria "${category.name}"? Solo se puede si no tiene ventas.`)) return;
    this.errorMessage = '';
    this.categoryService.delete(category.idCategory!).subscribe({
      next: () => {
        if (this.selectedCategory?.idCategory === category.idCategory) {
          this.selectedCategory = null;
          this.products = [];
        }
        this.loadCategories();
      },
      error: () =>
        (this.errorMessage =
          `No se pudo eliminar "${category.name}". Si ya tiene ventas registradas, desactivala en vez de borrarla.`),
    });
  }

  // ---------- Productos ----------

  loadProducts(): void {
    if (!this.selectedCategory?.idCategory) return;
    this.loadingProducts = true;
    const idCategory = this.selectedCategory.idCategory;
    this.productService.findAllRaw().subscribe({
      next: (data) => {
        this.products = data.filter((p) => p.category.idCategory === idCategory);
        this.loadingProducts = false;
      },
      error: (err) => this.fail(err, 'No se pudieron cargar los productos.'),
    });
  }

  selectProduct(product: Product): void {
    this.selectedProduct = product;
    this.newFlavor = this.blankFlavor();
    this.loadFlavors();
  }

  createProduct(): void {
    if (!this.selectedCategory) return;
    if (!this.newProduct.name.trim()) {
      this.errorMessage = 'El producto necesita un nombre.';
      return;
    }
    if (this.newProduct.price <= 0) {
      this.errorMessage = 'El precio debe ser mayor a 0.';
      return;
    }
    this.errorMessage = '';
    this.productService
      .save({
        ...this.newProduct,
        category: this.selectedCategory,
        station: this.newProduct.station ?? this.selectedCategory.station,
      })
      .subscribe({
        next: () => {
          this.newProduct = this.blankProduct();
          this.loadProducts();
        },
        error: (err) => this.fail(err, 'No se pudo crear el producto.'),
      });
  }

  saveProduct(product: Product): void {
    if (product.price <= 0) {
      this.errorMessage = `"${product.name}": el precio debe ser mayor a 0.`;
      return;
    }
    this.errorMessage = '';
    this.productService.update(product.idProduct!, product).subscribe({
      next: () => this.loadProducts(),
      error: (err) => this.fail(err, `No se pudo guardar "${product.name}".`),
    });
  }

  toggleProductActive(product: Product): void {
    if (product.price <= 0 && product.active === false) {
      this.errorMessage = `"${product.name}": asigna un precio antes de activarlo.`;
      return;
    }
    this.errorMessage = '';
    this.productService
      .update(product.idProduct!, { ...product, active: !product.active })
      .subscribe({
        next: (updated) => (product.active = updated.active),
        error: (err) => this.fail(err, 'No se pudo cambiar el estado del producto.'),
      });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Eliminar "${product.name}"? Solo se puede si no tiene ventas.`)) return;
    this.errorMessage = '';
    this.productService.delete(product.idProduct!).subscribe({
      next: () => {
        if (this.selectedProduct?.idProduct === product.idProduct) this.selectedProduct = null;
        this.loadProducts();
      },
      error: () =>
        (this.errorMessage =
          `No se pudo eliminar "${product.name}". Si ya tiene ventas registradas, desactivalo en vez de borrarlo.`),
    });
  }

  // ---------- Opciones (sabores, tamanos, preparaciones) ----------

  loadFlavors(): void {
    if (!this.selectedProduct?.idProduct) return;
    this.loadingFlavors = true;
    const idProduct = this.selectedProduct.idProduct;

    this.flavorService.findAllOfProduct(idProduct).subscribe({
      next: (own) => {
        if (own.length > 0) {
          this.flavors = own;
          this.flavorsAreInherited = false;
          this.loadingFlavors = false;
          return;
        }
        // Sin opciones propias: se muestran las heredadas de la categoria.
        const idCategory = this.selectedProduct?.category.idCategory;
        if (!idCategory) {
          this.flavors = [];
          this.flavorsAreInherited = false;
          this.loadingFlavors = false;
          return;
        }
        this.flavorService.findByCategory(idCategory).subscribe({
          next: (inherited) => {
            this.flavors = inherited;
            this.flavorsAreInherited = inherited.length > 0;
            this.loadingFlavors = false;
          },
          error: (err) => this.fail(err, 'No se pudieron cargar las opciones.'),
        });
      },
      error: (err) => this.fail(err, 'No se pudieron cargar las opciones.'),
    });
  }

  createFlavor(scope: 'PRODUCT' | 'CATEGORY'): void {
    if (!this.selectedProduct) return;
    if (!this.newFlavor.name.trim()) {
      this.errorMessage = 'La opcion necesita un nombre.';
      return;
    }
    this.errorMessage = '';

    const payload: Flavor = {
      ...this.newFlavor,
      idProduct: scope === 'PRODUCT' ? this.selectedProduct.idProduct : null,
      idCategory: scope === 'CATEGORY' ? this.selectedProduct.category.idCategory : null,
      orderIndex: this.flavors.length + 1,
    };

    this.flavorService.create(payload).subscribe({
      next: () => {
        this.newFlavor = this.blankFlavor();
        this.loadFlavors();
        this.ensureProductAsksForFlavor();
      },
      error: (err) => this.fail(err, 'No se pudo crear la opcion.'),
    });
  }

  saveFlavor(flavor: Flavor): void {
    this.errorMessage = '';
    this.flavorService.update(flavor.idFlavor!, flavor).subscribe({
      next: () => this.loadFlavors(),
      error: (err) => this.fail(err, 'No se pudo guardar la opcion.'),
    });
  }

  deleteFlavor(flavor: Flavor): void {
    if (!confirm(`Eliminar la opcion "${flavor.name}"?`)) return;
    this.errorMessage = '';
    this.flavorService.delete(flavor.idFlavor!).subscribe({
      next: () => this.loadFlavors(),
      error: (err) => this.fail(err, 'No se pudo eliminar la opcion.'),
    });
  }

  /** Un producto con opciones debe abrir el modal; si no, nunca se podrian elegir. */
  private ensureProductAsksForFlavor(): void {
    const p = this.selectedProduct;
    if (!p || p.requiresFlavor || p.price <= 0) return;
    this.productService.update(p.idProduct!, { ...p, requiresFlavor: true }).subscribe({
      next: () => {
        p.requiresFlavor = true;
        this.loadProducts();
      },
      error: () => {},
    });
  }

  // ---------- helpers ----------

  private fail(err: unknown, fallback: string): void {
    this.errorMessage = (err as { message?: string })?.message || fallback;
    this.loadingCategories = false;
    this.loadingProducts = false;
    this.loadingFlavors = false;
  }

  private blankCategory(): Category {
    return { name: '', description: '', station: 'COCINA', orderIndex: 0, active: true } as Category;
  }

  private blankProduct(): Product {
    return {
      name: '',
      price: 0,
      category: null as unknown as Category,
      station: undefined,
      requiresKitchen: true,
      requiresFlavor: false,
      active: true,
    };
  }

  private blankFlavor(): Flavor {
    return { name: '', priceDelta: 0, active: true };
  }
}
