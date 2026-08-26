import { Category } from './category';
import { KitchenStation } from './enums';

export interface Product {
  idProduct?: number;
  name: string;
  description?: string;
  price: number;
  category: Category;
  station?: KitchenStation;
  requiresKitchen?: boolean;
  /** Si es true, al elegirlo hay que pedir un sabor de su categoria. */
  requiresFlavor?: boolean;
  active?: boolean;
  manageStock?: boolean;
  stock?: number;
  imageUrl?: string;
}
