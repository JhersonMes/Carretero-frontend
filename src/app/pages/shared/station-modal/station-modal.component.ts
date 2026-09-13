import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenStation } from '../../../model/enums';
import { Product } from '../../../model/product';

/** Areas entre las que puede repartirse un adicional. */
const STATIONS: { key: KitchenStation; label: string; hint: string }[] = [
  { key: 'COCINA', label: 'Cocina', hint: 'Va con alitas, broaster o salchipapas' },
  { key: 'PARRILLA', label: 'Parrilla', hint: 'Va con hamburguesas o carnes a la brasa' },
  { key: 'BEBIDAS', label: 'Bebidas', hint: 'Lo prepara la barra' },
];

/**
 * Pregunta que area prepara un producto cuyo destino no esta fijado, como los
 * adicionales: un platano acompana tanto a unas alitas como a una hamburguesa.
 *
 * Se elige una sola area, no las dos. Si el item saliera en las dos pantallas,
 * o lo preparan ambas estaciones o ninguna, esperando que lo haga la otra.
 */
@Component({
  selector: 'app-station-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './station-modal.component.html',
  styleUrl: './station-modal.component.css',
})
export class StationModalComponent {
  @Input({ required: true }) product!: Product;

  @Output() confirmed = new EventEmitter<KitchenStation>();
  @Output() cancelled = new EventEmitter<void>();

  readonly stations = STATIONS;
  selected: KitchenStation | null = null;

  select(station: KitchenStation): void {
    this.selected = station;
  }

  confirm(): void {
    if (!this.selected) return;
    this.confirmed.emit(this.selected);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
