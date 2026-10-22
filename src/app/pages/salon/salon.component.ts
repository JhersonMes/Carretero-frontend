import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DiningTableService } from '../../services/dining-table.service';
import { KitchenSocketService } from '../../services/kitchen-socket.service';
import { TableBoard } from '../../model/table-board';
import { TableStatus } from '../../model/enums';

type SalonTab = 'MESA' | 'BARRA';

interface StatusMeta {
  label: string;
  color: string;
}

const STATUS_META: Record<TableStatus, StatusMeta> = {
  LIBRE: { label: 'Libre', color: '#2f9e58' },
  OCUPADA: { label: 'Ocupada', color: '#e31b22' },
  PIDIENDO_CUENTA: { label: 'Pidiendo cuenta', color: '#f0a202' },
  RESERVADA: { label: 'Reservada', color: '#3a6ea5' },
};

/** Minutos de espera a partir de los cuales la mesa se marca en naranja. */
const WARN_MINUTES = 6;
/** Minutos a partir de los cuales la mesa se marca en rojo. */
const LATE_MINUTES = 12;

/** Cada cuanto avanza el reloj en pantalla. */
const TICK_MS = 10_000;

export type WaitUrgency = 'fresh' | 'warn' | 'late';

@Component({
  selector: 'app-salon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './salon.component.html',
  styleUrl: './salon.component.css',
})
export class SalonComponent implements OnInit, OnDestroy {
  private tableService = inject(DiningTableService);
  private kitchenSocket = inject(KitchenSocketService);
  private router = inject(Router);

  private updatesSubscription?: Subscription;
  private tickHandle?: ReturnType<typeof setInterval>;

  tables: TableBoard[] = [];
  tab: SalonTab = 'MESA';
  loading = true;
  readonly statusMeta = STATUS_META;

  /** Reloj propio del componente: al avanzar re-renderiza los cronometros. */
  private now = Date.now();

  ngOnInit(): void {
    this.load();

    // Cocina despacha o caja cobra -> el mismo evento que refresca las comandas
    // refresca el salon, para que el mesero no tenga que recargar la pantalla.
    this.kitchenSocket.connect();
    this.updatesSubscription = this.kitchenSocket.updates$.subscribe(() => this.load());
    this.tickHandle = setInterval(() => (this.now = Date.now()), TICK_MS);
  }

  ngOnDestroy(): void {
    this.updatesSubscription?.unsubscribe();
    this.kitchenSocket.disconnect();
    if (this.tickHandle) clearInterval(this.tickHandle);
  }

  load(): void {
    this.tableService.findBoard().subscribe({
      next: (data) => {
        this.tables = data;
        this.now = Date.now();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get visibleTables(): TableBoard[] {
    return this.tables.filter((t) => this.isBar(t) === (this.tab === 'BARRA'));
  }

  isBar(table: TableBoard): boolean {
    return table.name.toLowerCase().includes('barra');
  }

  selectTab(tab: SalonTab): void {
    this.tab = tab;
  }

  openTable(table: TableBoard): void {
    if (!table.idTable) return;
    this.router.navigate(['/pages/salon', table.idTable]);
  }

  // ---------------------------------------------------------------------------
  // Cronometro
  //
  // Mientras quedan platos por despachar el reloj corre desde el envio del item
  // pendiente mas antiguo: es el que tiene esperando al cliente. Cuando la estacion
  // despacha todo, el reloj se congela y pasa a mostrar cuanto tardo la atencion
  // completa (del primer envio al ultimo despacho).
  // ---------------------------------------------------------------------------

  /** true mientras la mesa tenga platos sin despachar. */
  isWaiting(table: TableBoard): boolean {
    return table.totalItems > 0 && table.pendingItems > 0;
  }

  /** true cuando la estacion ya despacho todo lo que se pidio. */
  isDispatched(table: TableBoard): boolean {
    return table.totalItems > 0 && table.allDispatched;
  }

  /**
   * Solo se muestra el cronometro cuando hay con que calcularlo. Los pedidos
   * anteriores a que existieran las marcas de tiempo no las tienen, y ahi es
   * preferible no mostrar nada antes que mostrar un cero enganoso.
   */
  showTimer(table: TableBoard): boolean {
    if (this.isWaiting(table)) return !!table.oldestPendingSentAt;
    if (this.isDispatched(table)) return !!(table.firstSentAt && table.lastReadyAt);
    return false;
  }

  /** Minutos que se muestran en la mesa, corriendo o congelados. */
  waitMinutes(table: TableBoard): number {
    if (this.isWaiting(table)) {
      return this.minutesSince(table.oldestPendingSentAt, this.now);
    }
    if (this.isDispatched(table) && table.firstSentAt && table.lastReadyAt) {
      return this.minutesSince(table.firstSentAt, new Date(table.lastReadyAt).getTime());
    }
    return 0;
  }

  private minutesSince(from: string | undefined, until: number): number {
    if (!from) return 0;
    const start = new Date(from).getTime();
    if (isNaN(start)) return 0;
    return Math.max(0, Math.floor((until - start) / 60_000));
  }

  timerLabel(table: TableBoard): string {
    const mins = this.waitMinutes(table);
    if (mins < 1) return 'recien';
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}min`;
  }

  /** Solo colorea por urgencia lo que sigue esperando; lo despachado va en verde. */
  urgency(table: TableBoard): WaitUrgency {
    if (!this.isWaiting(table)) return 'fresh';
    const mins = this.waitMinutes(table);
    if (mins > LATE_MINUTES) return 'late';
    if (mins >= WARN_MINUTES) return 'warn';
    return 'fresh';
  }

  /** Texto del estado de cocina que ve el mesero en la propia mesa. */
  kitchenLabel(table: TableBoard): string {
    if (this.isDispatched(table)) return 'Despachado';
    if (this.isWaiting(table)) {
      return `En preparacion ${table.dispatchedItems}/${table.totalItems}`;
    }
    return '';
  }

  waitersLabel(table: TableBoard): string {
    return table.waiters?.length ? table.waiters.join(', ') : 'Sin mesero registrado';
  }

  trackByTable(_index: number, table: TableBoard): number {
    return table.idTable;
  }
}
