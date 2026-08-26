import { TableStatus } from './enums';

export interface DiningTable {
  idTable?: number;
  name: string;
  capacity: number;
  status: TableStatus;
  active?: boolean;
}
