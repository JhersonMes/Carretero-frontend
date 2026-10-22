import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { TableBoard } from '../model/table-board';
import { User } from '../model/user';
import { DiningTableService } from './dining-table.service';

/** Una mesa servida cuya cuenta todavia nadie cobro. */
export interface PendingCollection {
  /** Nombre de la mesa tal como se ve en el salon. */
  label: string;
  idTable: number;
  total: number;
  /** Meseros que intervinieron. Puede haber mas de uno en la misma mesa. */
  waiters: string[];
  /** true si el usuario conectado es uno de los que atendio. */
  mine: boolean;
}

/**
 * Mesas pendientes de cobro.
 *
 * Solo mira el salon: en una mesa la cuenta se cobra al final de la comida, asi
 * que un pedido abierto es plata que sigue en el aire. La venta rapida se cobra
 * al tomar el pedido (el cliente paga y se lleva su comida), de modo que nunca
 * deja una cuenta abierta y no debe trabar el cierre de caja.
 *
 * Se consulta siempre en vivo, nunca desde una copia guardada: la mesa la puede
 * bajar cualquiera de los meseros que la atendio, y una lista cacheada dejaria a
 * los demas viendo como pendiente algo que ya se cobro.
 */
@Injectable({ providedIn: 'root' })
export class PendingCollectionService {
  private tableService = inject(DiningTableService);

  /**
   * Mesas sin cobrar. Las del usuario conectado van primero, porque son las que
   * tiene que resolver el mismo.
   */
  loadPending(currentUser: User | null): Observable<PendingCollection[]> {
    const me = this.displayNameOf(currentUser);

    return this.tableService.findBoard().pipe(
      map((board) =>
        board
          .filter((table) => !!table.idOrder)
          .map((table) => this.fromBoard(table, me))
          .sort((a, b) => Number(b.mine) - Number(a.mine) || a.label.localeCompare(b.label))
      ),
      catchError(() => of([] as PendingCollection[]))
    );
  }

  private fromBoard(table: TableBoard, me: string): PendingCollection {
    const waiters = table.waiters ?? [];
    return {
      label: table.name,
      idTable: table.idTable,
      total: Number(table.orderTotal ?? 0),
      waiters,
      mine: this.includesName(waiters, me),
    };
  }

  /**
   * Mismo criterio que usa el backend para armar `waiters` en el tablero
   * (nombre completo y, si falta, el usuario), para que los nombres coincidan.
   */
  private displayNameOf(user: User | null | undefined): string {
    if (!user) return '';
    return (user.fullName || user.username || '').trim();
  }

  private includesName(waiters: string[], me: string): boolean {
    if (!me) return false;
    return waiters.some((name) => name.toLowerCase() === me.toLowerCase());
  }
}
