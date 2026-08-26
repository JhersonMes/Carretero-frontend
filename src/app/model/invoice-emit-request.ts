import { DocumentType, InvoiceType } from './enums';

export interface InvoiceEmitRequest {
  idOrder: number;
  invoiceType: InvoiceType;
  idClient?: number;
  docType?: DocumentType;
  docNumber?: string;
  clientName?: string;
  clientAddress?: string;
  clientEmail?: string;
}
