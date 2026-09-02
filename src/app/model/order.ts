import { Address } from './address';
import { Client } from './client';
import { DiningTable } from './dining-table';
import { OrderStatus, OrderType } from './enums';
import { OrderDetail } from './order-detail';
import { User } from './user';

export interface Order {
  idOrder?: number;
  orderCode?: string;
  saleType: OrderType;
  status: OrderStatus;
  table?: DiningTable;
  user?: User;
  client?: Client;
  deliveryAddress?: Address;
  deliveryFee?: number;
  subtotal?: number;
  discount?: number;
  total?: number;
  notes?: string;
  details?: OrderDetail[];
  /** Quien anulo la venta, cuando y por que. Vacio si la venta sigue vigente. */
  cancelledBy?: User;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt?: string;
  updatedAt?: string;
}
