export interface PriceHistory {
  idPriceHistory: number;
  idProduct: number;
  productName: string;
  previousPrice: number;
  newPrice: number;
  changedAt: string;
  changedByUsername: string;
}
