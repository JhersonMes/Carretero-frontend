import { DocumentType } from './enums';

export interface DniRucQueryResponse {
  success: boolean;
  docType: DocumentType;
  docNumber: string;
  name: string;
  address?: string;
  status?: string;
  message?: string;
  fromCache: boolean;
}
