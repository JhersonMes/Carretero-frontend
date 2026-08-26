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

  updateOrderStatus(idOrder: number, status: OrderStatus) {
    return this.http.patch<Order>(`${this.url}/${idOrder}/status`, { status });
  }

  updateItemStatus(idOrderDetail: number, status: OrderItemStatus) {
    return this.http.patch<OrderDetail>(
      `${this.url}/items/${idOrderDetail}/status`,
      { status }
    );
  }
}
