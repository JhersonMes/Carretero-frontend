export interface PaymentMethod {
  idPaymentMethod: number;
  name: string;
  code?: string;
  description?: string;
  active?: boolean;
}
