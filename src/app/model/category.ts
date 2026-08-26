import { KitchenStation } from './enums';

export interface Category {
  idCategory?: number;
  name: string;
  description?: string;
  station: KitchenStation;
  orderIndex?: number;
  active?: boolean;
}
