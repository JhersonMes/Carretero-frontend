export interface PaymentItemRequest {
  idPaymentMethod: number;
  amount: number;
  amountTendered?: number;
  changeGiven?: number;
  referenceNumber?: string;
}

export interface PaymentCreateRequest {
  idOrder: number;
  payments: PaymentItemRequest[];
}
