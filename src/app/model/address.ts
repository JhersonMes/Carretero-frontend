export interface Address {
  idAddress?: number;
  idClient?: number;
  street: string;
  number?: string;
  reference?: string;
  district?: string;
  favorite?: boolean;
  /** Lo que se cobra por repartir hasta este jiron. */
  deliveryFee?: number;
  createdAt?: string;
}
