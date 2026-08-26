export type OrderType = 'SALON' | 'DELIVERY' | 'VENTA_RAPIDA';

export type OrderStatus =
  | 'PENDIENTE'
  | 'EN_PREPARACION'
  | 'LISTO'
  | 'ENTREGADO'
  | 'PAGADO'
  | 'CANCELADO';

export type OrderItemStatus = 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO';

export type TableStatus = 'LIBRE' | 'OCUPADA' | 'PIDIENDO_CUENTA' | 'RESERVADA';

export type DocumentType = 'DNI' | 'RUC' | 'SIN_DOC' | 'CE' | 'PASAPORTE';

export type InvoiceType = 'BOLETA' | 'FACTURA' | 'NOTA_VENTA';

export type SunatStatus =
  | 'NO_ENVIADO'
  | 'PENDIENTE'
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'ANULADO';

export type CashMovementType = 'INGRESO' | 'EGRESO';

export type CashShiftStatus = 'ABIERTA' | 'CERRADA';

export type KitchenStation = 'COCINA' | 'PARRILLA' | 'BEBIDAS' | 'BARRA' | 'OTRO';
