import { OrderItemStatus } from './enums';

export interface KitchenItem {
  idOrderDetail: number;
  orderCode: string;
  tableName: string;
  productName: string;
  quantity: number;
  flavorName?: string;
  notes?: string;
  itemStatus: OrderItemStatus;
  /** Momento en que la comanda llego a la estacion; base del cronometro en pantalla. */
  sentAt: string;
}
