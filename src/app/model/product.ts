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
  /**
   * Si es true, el area que lo prepara se elige al pedirlo en vez de estar
   * fijada aqui. Es el caso de los adicionales, que acompanan tanto a un plato
   * de cocina como a uno de parrilla.
   */
  requiresStation?: boolean;
  active?: boolean;
  manageStock?: boolean;
  stock?: number;
  imageUrl?: string;
}
