import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CashShiftService } from '../../services/cash-shift.service';
import { KitchenSocketService } from '../../services/kitchen-socket.service';
import {
  PendingCollection,
  PendingCollectionService,
} from '../../services/pending-collection.service';
import { CashShift } from '../../model/cash-shift';

const AMOUNT_PRESETS = [100, 200];

@Component({
  selector: 'app-cash-shift',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-shift.component.html',
  styleUrl: './cash-shift.component.css',
})
export class CashShiftComponent implements OnInit, OnDestroy {
  private cashShiftService = inject(CashShiftService);
  private pendingService = inject(PendingCollectionService);
  private authService = inject(AuthService);
  private kitchenSocket = inject(KitchenSocketService);
  private router = inject(Router);

  activeShift: CashShift | null = null;
  /**
   * Turno recien cerrado. Es el unico momento en que esta pantalla muestra
   * importes: hasta el cierre la caja es ciega, para que quien cuenta el dinero
   * no sepa de antemano cuanto deberia haber.
   */
  closedShift: CashShift | null = null;
  loading = true;
  errorMessage = '';

  readonly amountPresets = AMOUNT_PRESETS;

  showOpenModal = false;
  openAmount: number | null = null;
  openNotes = '';
  opening = false;

  showCloseModal = false;
  closeAmount: number | null = null;
  closeNotes = '';
  closing = false;

  /** Mesas sin cobrar; mientras quede alguna, la caja no cierra. */
  pending: PendingCollection[] = [];
  checkingPending = false;
  showPendingModal = false;

  private updatesSubscription?: Subscription;

  ngOnInit(): void {
    this.loadShift();
    this.refreshPending();

    // Cobrar una mesa emite el mismo evento que refresca el salon. Escucharlo
    // mantiene la lista al dia sin que el mesero tenga que recargar: si otro de
    // los que atendio la mesa la baja, aqui desaparece sola.
    this.kitchenSocket.connect();
    this.updatesSubscription = this.kitchenSocket.updates$.subscribe(() => {
      this.refreshPending();
      // La caja es una sola para todo el local: si otro la cerro, esta pantalla
      // tiene que dejar de ofrecer el cierre en vez de esperar al click fallido.
      this.loadShift(true);
    });
  }

  ngOnDestroy(): void {
    this.updatesSubscription?.unsubscribe();
    this.kitchenSocket.disconnect();
  }

  // --- Cobros pendientes ---

  get hasPending(): boolean {
    return this.pending.length > 0;
  }

  get myPending(): PendingCollection[] {
    return this.pending.filter((p) => p.mine);
  }

  get otherPending(): PendingCollection[] {
    return this.pending.filter((p) => !p.mine);
  }

  private refreshPending(): void {
    this.pendingService.loadPending(this.authService.currentUser()).subscribe((pending) => {
      this.pending = pending;
    });
  }

  /** Vuelve a consultar y, si ya no queda nada, pasa directo al cierre. */
  recheckPending(): void {
    this.checkingPending = true;
    this.pendingService.loadPending(this.authService.currentUser()).subscribe((pending) => {
      this.pending = pending;
      this.checkingPending = false;
      if (!pending.length) {
        this.showPendingModal = false;
        this.openCloseModal();
      }
    });
  }

  closePendingModal(): void {
    this.showPendingModal = false;
  }

  goToTable(item: PendingCollection): void {
    this.showPendingModal = false;
    this.router.navigate(['/pages/salon', item.idTable]);
  }

  /**
   * @param silent no muestra el "Cargando": se usa en los refrescos automaticos,
   *        donde parpadear la pantalla entera seria peor que no avisar nada.
   */
  loadShift(silent = false): void {
    this.loading = !silent;
    this.cashShiftService.getActiveShift().subscribe({
      next: (shift) => {
        this.activeShift = shift;
        this.loading = false;
      },
      error: () => {
        this.activeShift = null;
        this.loading = false;
      },
    });
  }

  // --- Apertura de caja ---

  /** El signo ya lo comunica la etiqueta (sobrante/faltante); aqui va la magnitud. */
  absDifference(shift: CashShift): number {
    return Math.abs(shift.difference ?? 0);
  }

  /** Descarta el reporte del cierre para volver a la pantalla normal de caja. */
  dismissClosedReport(): void {
    this.closedShift = null;
  }

  openOpenModal(): void {
    this.closedShift = null;
    this.openAmount = null;
    this.openNotes = '';
    this.errorMessage = '';
    this.showOpenModal = true;
  }

  closeOpenModal(): void {
    this.showOpenModal = false;
  }

  pickPresetAmount(amount: number): void {
    this.openAmount = amount;
  }

  confirmOpenShift(): void {
    if (!this.openAmount || this.openAmount <= 0) {
      this.errorMessage = 'Ingresa un monto valido para aperturar la caja.';
      return;
    }

    this.opening = true;
    this.cashShiftService.openShift(this.openAmount, this.openNotes || undefined).subscribe({
      next: (shift) => {
        this.activeShift = shift;
        this.opening = false;
        this.showOpenModal = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudo aperturar la caja.';
        this.opening = false;
      },
    });
  }

  // --- Cierre de caja ---

  /**
   * Puerta de entrada al cierre. Vuelve a consultar los cobros pendientes en vez
   * de confiar en lo que ya tenia en pantalla: entre que se cargo la pagina y el
   * mesero pulsa el boton, otro pudo cobrar la mesa compartida (y entonces ya no
   * hay nada que bloquear) o abrir una nueva.
   */
  requestClose(): void {
    this.errorMessage = '';
    this.checkingPending = true;
    this.pendingService.loadPending(this.authService.currentUser()).subscribe((pending) => {
      this.pending = pending;
      this.checkingPending = false;
      if (pending.length) {
        this.showPendingModal = true;
        return;
      }
      this.openCloseModal();
    });
  }

  openCloseModal(): void {
    this.closeAmount = null;
    this.closeNotes = '';
    this.errorMessage = '';
    this.showCloseModal = true;
  }

  closeCloseModal(): void {
    this.showCloseModal = false;
  }

  confirmCloseShift(): void {
    if (!this.activeShift?.idCashShift) return;
    if (this.closeAmount === null || this.closeAmount < 0) {
      this.errorMessage = 'Ingresa el monto contado en caja.';
      return;
    }

    this.closing = true;
    this.cashShiftService
      .closeShift(this.activeShift.idCashShift, this.closeAmount, this.closeNotes || undefined)
      .subscribe({
        next: (closed) => {
          this.activeShift = null;
          this.closedShift = closed;
          this.closing = false;
          this.showCloseModal = false;
        },
        error: (err) => {
          this.errorMessage = err?.message || 'No se pudo cerrar la caja.';
          this.closing = false;

          // El backend valida lo mismo que esta pantalla y es el que manda. Si
          // rechazo el cierre, lo que se ve aqui quedo viejo: puede que alguien
          // haya abierto otra mesa, o que ya haya cerrado la caja el mismo. Se
          // recarga todo para que la pantalla vuelva a reflejar la realidad.
          this.loadShift();
          this.refreshPending();
        },
      });
  }
}
