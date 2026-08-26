import { Address } from './address';
import { DocumentType } from './enums';

export interface Client {
  idClient?: number;
  docType: DocumentType;
  docNumber?: string;
  name: string;
  phone?: string;
  email?: string;
  active?: boolean;
  addresses?: Address[];
  createdAt?: string;
}
