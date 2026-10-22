import { SunatEnvironment } from './enums';

export interface BusinessConfig {
  idConfig?: number;
  businessName: string;
  commercialName?: string;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;

  boletaSeries?: string;
  facturaSeries?: string;
  notaVentaSeries?: string;

  /** Ambiente de emision. Si viene vacio, el backend lo trata como SIMULADO. */
  sunatEnvironment?: SunatEnvironment;
  sunatApiUrl?: string;
  sunatApiToken?: string;
  dniRucApiUrl?: string;
  dniRucApiToken?: string;

  kitchenPrinterIp?: string;
  kitchenPrinterPort?: number;
  kitchenPrinterEnabled?: boolean;

  barPrinterIp?: string;
  barPrinterPort?: number;
  barPrinterEnabled?: boolean;

  cashierPrinterIp?: string;
  cashierPrinterPort?: number;
  cashierPrinterEnabled?: boolean;

  active?: boolean;
}
