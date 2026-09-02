import { OrderStatus, OrderType } from './enums';
import { PaymentMethod } from './payment-method';
import { User } from './user';

export interface Payment {
  idPayment: number;
  idOrder?: number;
  idCashShift?: number;
  /** Datos del pedido cobrado, para leer el cobro sin abrir la venta. */
  orderCode?: string;
  saleType?: OrderType;
  tableName?: string;
  /** Estado del pedido: con el se marcan las ventas anuladas en el historial. */
  orderStatus?: OrderStatus;
  amount: number;
  amountTendered?: number;
  changeGiven?: number;
  referenceNumber?: string;
  paymentMethod: PaymentMethod;
  user?: User;
  paymentDate?: string;
  clientName?: string;
  rucClient?: string;
  details?: string;
  pdfUrl?: string;
  status?: string;
}
