import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { InvoiceType } from '../model/enums';
import { Invoice } from '../model/invoice';
import { InvoiceEmitRequest } from '../model/invoice-emit-request';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService extends GenericService<Invoice> {
  protected override url: string = `${environment.HOST}/invoices`;

  findByOrder(idOrder: number) {
    return this.http.get<Invoice>(`${this.url}/order/${idOrder}`);
  }

  findByType(type: InvoiceType) {
    return this.http.get<Invoice[]>(`${this.url}/type/${type}`);
  }

  getNextNumber(type: InvoiceType) {
    return this.http.get<{ nextNumber: string }>(
      `${this.url}/next-number/${type}`
    );
  }

  emitInvoice(request: InvoiceEmitRequest) {
    return this.http.post<Invoice>(`${this.url}/emit`, request);
  }

  /**
   * Reemite el comprobante de una venta ya cobrada: anula el actual y emite uno
   * nuevo con los datos corregidos. No cambia lo vendido ni el total.
   */
  reissueInvoice(request: InvoiceEmitRequest, pin: string) {
    return this.http.post<Invoice>(`${this.url}/reissue`, request, {
      params: { pin },
    });
  }

  /** Todos los comprobantes del pedido, anulados incluidos. */
  findAllByOrder(idOrder: number) {
    return this.http.get<Invoice[]>(`${this.url}/order/${idOrder}/all`);
  }
}
