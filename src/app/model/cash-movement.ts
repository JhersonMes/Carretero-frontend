import { CashMovementType } from './enums';
import { User } from './user';

export interface CashMovement {
  idMovement?: number;
  idCashShift: number;
  user?: User;
  type: CashMovementType;
  amount: number;
  reason: string;
  createdAt?: string;
}
