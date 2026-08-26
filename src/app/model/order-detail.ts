import { OrderItemStatus } from './enums';

export interface OrderDetail {
  idOrderDetail?: number;
  idProduct?: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  flavorName?: string;
  notes?: string;
  subtotal: number;
  itemStatus?: OrderItemStatus;
}
