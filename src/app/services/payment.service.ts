import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Payment } from '../model/payment';
import { PaymentCreateRequest } from '../model/payment-create-request';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService extends GenericService<Payment> {
  protected override url: string = `${environment.HOST}/payments`;

  findByOrder(idOrder: number) {
    return this.http.get<Payment[]>(`${this.url}/order/${idOrder}`);
  }

  findByShift(idCashShift: number) {
    return this.http.get<Payment[]>(`${this.url}/shift/${idCashShift}`);
  }

  /**
   * Solo los cobros del usuario conectado en ese turno. El backend resuelve de
   * quien son a partir de la sesion; aqui no se manda ningun id de usuario.
   */
  findMineByShift(idCashShift: number) {
    return this.http.get<Payment[]>(`${this.url}/shift/${idCashShift}/mine`);
  }

  registerPayments(request: PaymentCreateRequest) {
    return this.http.post<Payment[]>(this.url, request);
  }
}
