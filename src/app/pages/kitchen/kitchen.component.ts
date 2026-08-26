import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { KitchenSocketService } from '../../services/kitchen-socket.service';
import { KitchenItem } from '../../model/kitchen-item';
import { KitchenStation } from '../../model/enums';

const STATIONS: KitchenStation[] = ['COCINA', 'PARRILLA', 'BEBIDAS'];

/** Minutos en la estacion a partir de los cuales la comanda se marca en naranja. */
const WARN_MINUTES = 6;
/** Minutos a partir de los cuales la comanda se marca en rojo. */
const LATE_MINUTES = 12;

/** Cada cuanto se refresca el cronometro en pantalla. */
const TICK_MS = 10_000;

export type Urgency = 'fresh' | 'warn' | 'late';

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen.component.html',
  styleUrl: './kitchen.component.css',
})
export class KitchenComponent implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private kitchenSocket = inject(KitchenSocketService);

  private updatesSubscription?: Subscription;
  private tickHandle?: ReturnType<typeof setInterval>;

  station: KitchenStation | null = null;
  items: KitchenItem[] = [];
  loading = true;

  /** Reloj propio del componente: al avanzar re-renderiza los cronometros. */
  private now = Date.now();

  ngOnInit(): void {
    this.authService.fetchCurrentUser().subscribe({
      next: (user) => {
        const role = (user.role?.name ?? '').toUpperCase();
        this.station = STATIONS.includes(role as KitchenStation) ? (role as KitchenStation) : null;
        this.load();

        if (this.station) {
          this.kitchenSocket.connect();
          this.updatesSubscription = this.kitchenSocket.updates$.subscribe(() => this.load());
          this.tickHandle = setInterval(() => (this.now = Date.now()), TICK_MS);
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.updatesSubscription?.unsubscribe();
    this.kitchenSocket.disconnect();
    if (this.tickHandle) clearInterval(this.tickHandle);
  }

  load(): void {
    if (!this.station) {
      this.loading = false;
      return;
    }
    this.loading = true;
    this.orderService.findPendingItemsByStation(this.station).subscribe({
      next: (data) => {
        this.items = data;
        this.now = Date.now();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  /** Minutos completos que la comanda lleva esperando en la estacion. */
  elapsedMinutes(item: KitchenItem): number {
    const sent = new Date(item.sentAt).getTime();
    if (isNaN(sent)) return 0;
    return Math.max(0, Math.floor((this.now - sent) / 60_000));
  }

  elapsedLabel(item: KitchenItem): string {
    const mins = this.elapsedMinutes(item);
    if (mins < 1) return 'recien';
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}min`;
  }

  urgency(item: KitchenItem): Urgency {
    const mins = this.elapsedMinutes(item);
    if (mins > LATE_MINUTES) return 'late';
    if (mins >= WARN_MINUTES) return 'warn';
    return 'fresh';
  }

  actionLabel(item: KitchenItem): string {
    return item.itemStatus === 'PENDIENTE' ? 'Marcar en preparacion' : 'Marcar despachado';
  }

  advance(item: KitchenItem): void {
    const next = item.itemStatus === 'PENDIENTE' ? 'EN_PREPARACION' : 'LISTO';
    this.orderService.updateItemStatus(item.idOrderDetail, next).subscribe(() => this.load());
  }
}
