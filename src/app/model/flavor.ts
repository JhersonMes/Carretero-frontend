export interface Flavor {
  idFlavor?: number;
  name: string;
  /** Se llena cuando la opcion es de toda una categoria. */
  idCategory?: number | null;
  /** Se llena cuando la opcion es propia de un solo producto. */
  idProduct?: number | null;
  /** Cuanto suma o resta al precio del producto. */
  priceDelta?: number;
  orderIndex?: number;
  active: boolean;
}
