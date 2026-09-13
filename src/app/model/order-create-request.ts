import { KitchenStation, OrderType } from './enums';

export interface OrderItemRequest {
  idProduct: number;
  quantity: number;
  idFlavor?: number;
  flavorName?: string;
  /** Area elegida para esta linea. Vacio deja la del producto. */
  station?: KitchenStation;
  notes?: string;
}

export interface OrderCreateRequest {
  saleType: OrderType;
  idTable?: number;
  idClient?: number;
  idAddress?: number;
  deliveryFee?: number;
  discount?: number;
  notes?: string;
  items: OrderItemRequest[];
}
