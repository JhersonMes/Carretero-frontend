import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenStation } from '../../../model/enums';
import { Product } from '../../../model/product';

/** Un plato del pedido y el area que lo prepara. */
export interface DishOption {
  name: string;
  station: KitchenStation;
}

/** Areas, para cuando el pedido todavia no tiene ningun plato al que engancharse. */
const STATIONS: { key: KitchenStation; label: string }[] = [
  { key: 'COCINA', label: 'Cocina' },
  { key: 'PARRILLA', label: 'Parrilla' },
  { key: 'BEBIDAS', label: 'Bebidas' },
];

/**
 * Pregunta a que plato acompana un adicional, y de ahi sale el area.
 *
 * Se pregunta por el plato y no por la estacion porque es lo que el mesero
 * tiene en la cabeza: sabe que el platano va con la hamburguesa, no que "va a
 * parrilla". El area es una consecuencia, y traducirla mentalmente en cada
 * adicional es justo el paso tedioso que hay que evitar.
 *
 * Si el pedido todavia no tiene platos, no hay a que engancharse y recien ahi
 * se ofrecen las areas directamente.
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

  /** Platos del pedido, ya sin repetidos. Vacio = se eligen areas. */
  @Input() dishes: DishOption[] = [];

  @Output() confirmed = new EventEmitter<KitchenStation>();
  @Output() cancelled = new EventEmitter<void>();

  readonly stations = STATIONS;
  selected: KitchenStation | null = null;
  /** Nombre del plato elegido, solo para marcarlo en la lista. */
  selectedDish: string | null = null;

  get hasDishes(): boolean {
    return this.dishes.length > 0;
  }

  selectDish(dish: DishOption): void {
    this.selected = dish.station;
    this.selectedDish = dish.name;
  }

  selectStation(station: KitchenStation): void {
    this.selected = station;
    this.selectedDish = null;
  }

  labelOf(station: KitchenStation): string {
    return STATIONS.find((s) => s.key === station)?.label ?? station;
  }

  confirm(): void {
    if (!this.selected) return;
    this.confirmed.emit(this.selected);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}

/**
 * Quita los platos repetidos y los que no tienen area.
 *
 * Lo usan las tres pantallas de venta para armar la lista con la misma regla:
 * si cada una dedujera los platos a su manera, el mismo pedido ofreceria
 * opciones distintas segun donde se tome.
 */
export function toDishOptions(
  entries: { name: string; station?: KitchenStation | null }[]
): DishOption[] {
  const seen = new Map<string, DishOption>();
  for (const entry of entries) {
    if (!entry.station) continue;
    const key = `${entry.name}|${entry.station}`;
    if (!seen.has(key)) seen.set(key, { name: entry.name, station: entry.station });
  }
  return [...seen.values()];
}

/** Las areas distintas a las que va el pedido. */
export function areasOf(dishes: DishOption[]): KitchenStation[] {
  return [...new Set(dishes.map((d) => d.station))];
}
