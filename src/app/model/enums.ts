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

/**
 * SIMULADO no es lo mismo que ACEPTADO: el primero significa que el comprobante
 * nunca salio del equipo y el segundo que SUNAT lo acepto. Es la diferencia
 * entre estar declarado y creer que se esta.
 */
export type SunatStatus =
  | 'NO_ENVIADO'
  | 'SIMULADO'
  | 'PENDIENTE'
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'ANULADO';

/** Ambiente de emision configurado en el negocio. */
export type SunatEnvironment = 'SIMULADO' | 'BETA' | 'PRODUCCION';

export type CashMovementType = 'INGRESO' | 'EGRESO';

export type CashShiftStatus = 'ABIERTA' | 'CERRADA';

export type KitchenStation = 'COCINA' | 'PARRILLA' | 'BEBIDAS' | 'BARRA' | 'OTRO';
