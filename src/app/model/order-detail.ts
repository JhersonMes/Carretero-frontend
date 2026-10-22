import { KitchenStation, OrderItemStatus } from './enums';

export interface OrderDetail {
  idOrderDetail?: number;
  idProduct?: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  flavorName?: string;
  /** Area elegida para esta linea; vacio significa la del producto. */
  station?: KitchenStation;
  /** Area propia del producto: el area efectiva es `station` si esta, y esta si no. */
  productStation?: KitchenStation;
  notes?: string;
  subtotal: number;
  itemStatus?: OrderItemStatus;
}
