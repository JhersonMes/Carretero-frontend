import { Client } from './client';
import { InvoiceType, SunatStatus } from './enums';

export interface Invoice {
  idInvoice?: number;
  idOrder?: number;
  orderCode?: string;
  client?: Client;
  invoiceType: InvoiceType;
  series?: string;
  correlativeNumber?: number;
  fullNumber?: string;
  issueDate?: string;
  taxableAmount?: number;
  igvAmount?: number;
  totalAmount?: number;
  sunatStatus?: SunatStatus;
  sunatResponseCode?: string;
  sunatDescription?: string;
  cdrHash?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  qrData?: string;
}
