import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlavorService } from '../../../services/flavor.service';
import { Flavor } from '../../../model/flavor';
import { Product } from '../../../model/product';

/**
 * Pide el sabor al agregar un producto que lo exige (ej. "Alitas De Pollo X 8").
 * Los sabores se consultan por la categoria del producto.
 */
@Component({
  selector: 'app-flavor-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flavor-modal.component.html',
  styleUrl: './flavor-modal.component.css',
})
export class FlavorModalComponent implements OnInit {
  private flavorService = inject(FlavorService);

  @Input({ required: true }) product!: Product;

  @Output() confirmed = new EventEmitter<Flavor>();
  @Output() cancelled = new EventEmitter<void>();

  flavors: Flavor[] = [];
  selected: Flavor | null = null;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    const idProduct = this.product.idProduct;
    if (!idProduct) {
      this.loading = false;
      this.errorMessage = 'Este producto no es valido.';
      return;
    }

    this.flavorService.findForProduct(idProduct).subscribe({
      next: (data) => {
        this.flavors = data;
        this.loading = false;
        if (data.length === 0) {
          this.errorMessage = 'Este producto no tiene opciones configuradas.';
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudieron cargar las opciones.';
      },
    });
  }

  /** Precio final si se elige esta opcion. */
  priceWith(flavor: Flavor): number {
    return this.product.price + (flavor.priceDelta ?? 0);
  }

  select(flavor: Flavor): void {
    this.selected = flavor;
  }

  confirm(): void {
    if (!this.selected) return;
    this.confirmed.emit(this.selected);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
