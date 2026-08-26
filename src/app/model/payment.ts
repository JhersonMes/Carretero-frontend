import { PaymentMethod } from './payment-method';
import { User } from './user';

export interface Payment {
  idPayment: number;
  idOrder?: number;
  idCashShift?: number;
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
