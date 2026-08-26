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
