import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { KitchenStation, OrderItemStatus, OrderStatus, OrderType } from '../model/enums';
import { KitchenItem } from '../model/kitchen-item';
import { Order } from '../model/order';
import {
  OrderCreateRequest,
  OrderItemRequest,
} from '../model/order-create-request';
import { OrderDetail } from '../model/order-detail';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class OrderService extends GenericService<Order> {
  protected override url: string = `${environment.HOST}/orders`;

  findActiveOrders() {
    return this.http.get<Order[]>(this.url);
  }

  findAllRaw() {
    return this.http.get<Order[]>(`${this.url}/all`);
  }

  findByCode(orderCode: string) {
    return this.http.get<Order>(`${this.url}/code/${orderCode}`);
  }

  findByStatus(status: OrderStatus) {
    return this.http.get<Order[]>(`${this.url}/status/${status}`);
  }

  findBySaleType(saleType: OrderType) {
    return this.http.get<Order[]>(`${this.url}/sale-type/${saleType}`);
  }

  findActiveOrderForTable(idTable: number) {
    return this.http.get<Order>(`${this.url}/table/${idTable}/active`);
  }

  findPendingItemsByStation(station: KitchenStation) {
    return this.http.get<KitchenItem[]>(`${this.url}/items/station/${station}`);
  }

  createOrder(request: OrderCreateRequest) {
    return this.http.post<Order>(this.url, request);
  }

  addItems(idOrder: number, items: OrderItemRequest[]) {
    return this.http.post<Order>(`${this.url}/${idOrder}/items`, items);
  }

  /**
   * Anula una venta. El PIN lo comprueba el backend; aqui solo se transporta.
   * La venta no se borra: queda registrada como anulada con quien la anulo.
   */
  cancelOrder(idOrder: number, pin: string, reason?: string) {
    return this.http.post<Order>(`${this.url}/${idOrder}/cancel`, { pin, reason });
  }

  /** Ventas anuladas. Solo para el panel de administracion. */
  findCancelled() {
    return this.http.get<Order[]>(`${this.url}/cancelled`);
  }

  updateOrderStatus(idOrder: number, status: OrderStatus) {
    return this.http.patch<Order>(`${this.url}/${idOrder}/status`, { status });
  }

  /**
   * Quita un plato de un pedido abierto. Pide PIN porque baja el monto de una
   * cuenta y el plato pudo haberse cocinado ya.
   */
  removeItem(idOrderDetail: number, pin: string) {
    return this.http.delete<Order>(`${this.url}/items/${idOrderDetail}`, {
      params: { pin },
    });
  }

  /** Nota del plato ("sin aji", "para llevar"). No mueve el monto. */
  updateItemNotes(idOrderDetail: number, notes: string) {
    return this.http.patch<OrderDetail>(`${this.url}/items/${idOrderDetail}/notes`, { notes });
  }

  updateItemStatus(idOrderDetail: number, status: OrderItemStatus) {
    return this.http.patch<OrderDetail>(
      `${this.url}/items/${idOrderDetail}/status`,
      { status }
    );
  }
}
