import { TableStatus } from './enums';

export interface DiningTable {
  idTable?: number;
  name: string;
  capacity: number;
  status: TableStatus;
  /** Posicion de la mesa en el plano del salon, definida por el administrador. */
  orderIndex?: number;
  active?: boolean;
}
