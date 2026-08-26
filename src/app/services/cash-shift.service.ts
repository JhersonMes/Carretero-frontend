import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { CashMovement } from '../model/cash-movement';
import { CashShift } from '../model/cash-shift';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class CashShiftService extends GenericService<CashShift> {
  protected override url: string = `${environment.HOST}/cash-shifts`;

  getActiveShift() {
    return this.http.get<CashShift>(`${this.url}/active`);
  }

  openShift(initialAmount: number, notes?: string) {
    return this.http.post<CashShift>(`${this.url}/open`, {
      initialAmount,
      notes,
    });
  }

  closeShift(idCashShift: number, actualCash: number, notes?: string) {
    return this.http.post<CashShift>(`${this.url}/close`, {
      idCashShift,
      actualCash,
      notes,
    });
  }

  registerMovement(movement: CashMovement) {
    return this.http.post<CashMovement>(`${this.url}/movements`, movement);
  }

  getMovements(idCashShift: number) {
    return this.http.get<CashMovement[]>(`${this.url}/${idCashShift}/movements`);
  }

  recalculate(idCashShift: number) {
    return this.http.post<CashShift>(`${this.url}/${idCashShift}/recalculate`, {});
  }
}
