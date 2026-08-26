import { CashShiftStatus } from './enums';
import { User } from './user';

export interface CashShift {
  idCashShift?: number;
  user?: User;
  openTime?: string;
  closeTime?: string;
  initialAmount: number;
  cashSales?: number;
  cardSales?: number;
  yapeSales?: number;
  plinSales?: number;
  transferSales?: number;
  cashIn?: number;
  cashOut?: number;
  expectedCash?: number;
  actualCash?: number;
  difference?: number;
  status: CashShiftStatus;
  notes?: string;
}
