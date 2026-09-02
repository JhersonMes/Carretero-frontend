import { Injectable } from '@angular/core';
import { BusinessConfig } from '../model/business-config';

/** Una linea de la boleta tal como se imprime, ya sin depender del carrito. */
export interface ReceiptLine {
  name: string;
  option?: string;
  quantity: number;
  /** Precio unitario de venta, con IGV incluido (es como se cotiza en carta). */
  unitPrice: number;
}

export interface DeliveryReceiptData {
  business: BusinessConfig | null;
  /** Numero del comprobante emitido (ej. B001-00000001). */
  invoiceNumber?: string;
  orderCode: string;
  issuedAt: Date;
  clientName: string;
  clientDocType?: string;
  clientDoc?: string;
  clientPhone?: string;
  /** Jiron / calle a donde va el pedido, ya armado en una linea. */
  addressLine: string;
  addressReference?: string;
  lines: ReceiptLine[];
  /** Venta de los productos, con IGV incluido. */
  subtotal: number;
  deliveryFee: number;
  /** Base imponible: el total sin IGV. */
  taxableAmount: number;
  igvAmount: number;
  total: number;
  paymentMethod?: string;
  cashier?: string;
  /** Cadena del QR del comprobante, si el backend lo emitio. */
  qrData?: string;
}

/** Ancho del rollo de la ticketera; la boleta se maqueta para ese formato. */
const TICKET_WIDTH_MM = 80;

/** IGV vigente en Peru. Los precios de carta ya lo llevan incluido. */
export const IGV_RATE = 0.18;

/**
 * A partir de este monto la SUNAT exige identificar al comprador en la boleta.
 * Debajo de el, la venta puede ir sin documento del cliente.
 */
export const BOLETA_DNI_THRESHOLD = 700;

const UNITS = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE',
  'DIECIOCHO', 'DIECINUEVE', 'VEINTE',
];
const TENS = [
  '', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA',
  'OCHENTA', 'NOVENTA',
];
const HUNDREDS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

/**
 * Boleta de venta de delivery en PDF.
 *
 * Sigue la forma de una boleta peruana: los precios de carta ya incluyen el IGV,
 * asi que el impuesto no se suma al final sino que se desagrega del total
 * (base = total / 1.18), que es el mismo calculo que hace el backend al emitir
 * el comprobante. Ademas del detalle lleva el importe en letras, obligatorio en
 * los comprobantes de pago.
 *
 * Se arma como documento imprimible y se manda al dialogo de impresion, donde
 * "Guardar como PDF" produce el archivo. Asi no hace falta ninguna libreria
 * extra ni que el backend genere el binario.
 */
@Injectable({ providedIn: 'root' })
export class DeliveryReceiptService {
  /**
   * Desagrega el IGV de un total que ya lo incluye. Se redondea la base y el
   * impuesto se saca por diferencia para que base + IGV de exactamente el total
   * cobrado y la boleta no descuadre por un centimo.
   */
  breakdown(total: number): { taxableAmount: number; igvAmount: number } {
    const amount = Number(total ?? 0);
    const taxableAmount = Math.round((amount / (1 + IGV_RATE)) * 100) / 100;
    return { taxableAmount, igvAmount: Math.round((amount - taxableAmount) * 100) / 100 };
  }

  /**
   * Abre el dialogo de impresion con la boleta ya maquetada. Se usa un iframe
   * oculto y no una ventana nueva porque los bloqueadores de popups impiden
   * abrirla y el cajero se quedaria sin boleta sin saber por que.
   */
  print(data: DeliveryReceiptData): void {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.srcdoc = this.buildHtml(data);

    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) {
        frame.remove();
        return;
      }
      // El iframe se retira recien cuando el dialogo se cierra: quitarlo antes
      // cancelaria la impresion a medio camino.
      win.addEventListener('afterprint', () => frame.remove());
      win.focus();
      win.print();
    };

    document.body.appendChild(frame);
  }

  private buildHtml(data: DeliveryReceiptData): string {
    const b = data.business;
    const money = (value: number) => `S/ ${Number(value ?? 0).toFixed(2)}`;
    const emitted = !!data.invoiceNumber;

    const items = data.lines
      .map(
        (line) => `
          <tr>
            <td class="qty">${line.quantity}</td>
            <td class="desc">
              ${this.escape(line.name)}
              ${line.option ? `<span class="opt">${this.escape(line.option)}</span>` : ''}
              <span class="unit">${money(line.unitPrice)} c/u</span>
            </td>
            <td class="amount">${money(line.unitPrice * line.quantity)}</td>
          </tr>`
      )
      .join('');

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Boleta ${this.escape(data.invoiceNumber || data.orderCode)}</title>
<style>
  @page { size: ${TICKET_WIDTH_MM}mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body {
    width: ${TICKET_WIDTH_MM - 8}mm;
    margin: 0 auto;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 10px;
    line-height: 1.35;
    color: #000;
  }
  .center { text-align: center; }
  .business { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; }
  .muted { font-size: 9px; }
  .doc-type {
    margin: 8px 0 2px;
    padding: 4px 0;
    border: 1px solid #000;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .doc-number { font-size: 12px; font-weight: 700; }
  .sim { margin-top: 2px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  .field { display: flex; gap: 6px; }
  .field span:first-child { min-width: 58px; font-weight: 700; }
  .field span:last-child { flex: 1; word-break: break-word; }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    border-bottom: 1px solid #000;
    padding-bottom: 3px;
    font-size: 9px;
    text-align: left;
    text-transform: uppercase;
  }
  thead th.amount, td.amount { text-align: right; }
  thead th.qty, td.qty { width: 22px; text-align: left; }
  td { padding: 4px 0; vertical-align: top; }
  td.desc span { display: block; }
  .opt { font-size: 9px; font-style: italic; }
  .unit { font-size: 9px; }
  .totals { margin-top: 6px; }
  .total-row { display: flex; justify-content: space-between; }
  .total-row.grand {
    margin-top: 5px;
    padding-top: 5px;
    border-top: 1px solid #000;
    font-size: 13px;
    font-weight: 700;
  }
  .words {
    margin-top: 6px;
    padding-top: 5px;
    border-top: 1px dashed #000;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .qr { margin-top: 8px; font-size: 7px; word-break: break-all; }
  .footer { margin-top: 10px; font-size: 9px; }
</style>
</head>
<body>
  <div class="center">
    <div class="business">${this.escape(b?.commercialName || b?.businessName || 'EL CARRETERO')}</div>
    ${b?.businessName && b?.commercialName ? `<div class="muted">${this.escape(b.businessName)}</div>` : ''}
    ${b?.ruc ? `<div class="muted">RUC ${this.escape(b.ruc)}</div>` : ''}
    ${b?.address ? `<div class="muted">${this.escape(b.address)}</div>` : ''}
    ${b?.phone ? `<div class="muted">Tel. ${this.escape(b.phone)}</div>` : ''}

    <div class="doc-type">Boleta de venta electronica</div>
    <div class="doc-number">${this.escape(data.invoiceNumber || data.orderCode)}</div>
    <div class="sim">
      ${emitted
        ? `Pedido ${this.escape(data.orderCode)} - Delivery`
        : 'Documento interno de delivery - sin numero de comprobante'}
    </div>
  </div>

  <hr />

  <div class="field"><span>Emision</span><span>${this.formatDate(data.issuedAt)}</span></div>
  <div class="field"><span>Cliente</span><span>${this.escape(data.clientName)}</span></div>
  ${data.clientDoc
      ? `<div class="field"><span>${this.escape(data.clientDocType || 'DOC')}</span><span>${this.escape(data.clientDoc)}</span></div>`
      : ''}
  ${data.clientPhone ? `<div class="field"><span>Telefono</span><span>${this.escape(data.clientPhone)}</span></div>` : ''}
  <div class="field"><span>Direccion</span><span>${this.escape(data.addressLine)}</span></div>
  ${data.addressReference ? `<div class="field"><span>Ref.</span><span>${this.escape(data.addressReference)}</span></div>` : ''}
  ${data.cashier ? `<div class="field"><span>Cajero</span><span>${this.escape(data.cashier)}</span></div>` : ''}

  <hr />

  <table>
    <thead>
      <tr>
        <th class="qty">Cant</th>
        <th>Descripcion</th>
        <th class="amount">Importe</th>
      </tr>
    </thead>
    <tbody>${items}</tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Consumo</span><span>${money(data.subtotal)}</span></div>
    <div class="total-row"><span>Delivery</span><span>${money(data.deliveryFee)}</span></div>
    <div class="total-row"><span>Op. gravada</span><span>${money(data.taxableAmount)}</span></div>
    <div class="total-row"><span>IGV (${(IGV_RATE * 100).toFixed(0)}%)</span><span>${money(data.igvAmount)}</span></div>
    <div class="total-row grand"><span>Total</span><span>${money(data.total)}</span></div>
  </div>

  <div class="words">${this.amountInWords(data.total)}</div>

  ${data.paymentMethod ? `<hr /><div class="field"><span>Pago</span><span>${this.escape(data.paymentMethod)}</span></div>` : ''}

  <div class="center footer">
    <div>Los precios incluyen IGV</div>
    <div>Gracias por su compra</div>
    <div>Delivery a ${this.escape(data.addressLine)}</div>
    ${data.qrData ? `<div class="qr">${this.escape(data.qrData)}</div>` : ''}
  </div>
</body>
</html>`;
  }

  /** "SON: CIENTO VEINTE CON 50/100 SOLES", como exige un comprobante peruano. */
  private amountInWords(total: number): string {
    const amount = Math.round(Number(total ?? 0) * 100) / 100;
    const whole = Math.floor(amount);
    const cents = Math.round((amount - whole) * 100);
    return `SON: ${this.toWords(whole)} CON ${String(cents).padStart(2, '0')}/100 SOLES`;
  }

  private toWords(n: number): string {
    if (n === 0) return 'CERO';
    if (n <= 20) return UNITS[n];
    if (n < 100) {
      const tens = Math.floor(n / 10);
      const unit = n % 10;
      if (tens === 2) return unit ? `VEINTI${UNITS[unit]}` : 'VEINTE';
      return unit ? `${TENS[tens]} Y ${UNITS[unit]}` : TENS[tens];
    }
    if (n === 100) return 'CIEN';
    if (n < 1000) {
      const hundreds = Math.floor(n / 100);
      const rest = n % 100;
      return rest ? `${HUNDREDS[hundreds]} ${this.toWords(rest)}` : HUNDREDS[hundreds];
    }
    if (n < 1_000_000) {
      const thousands = Math.floor(n / 1000);
      const rest = n % 1000;
      const head = thousands === 1 ? 'MIL' : `${this.toWords(thousands)} MIL`;
      return rest ? `${head} ${this.toWords(rest)}` : head;
    }
    const millions = Math.floor(n / 1_000_000);
    const rest = n % 1_000_000;
    const head = millions === 1 ? 'UN MILLON' : `${this.toWords(millions)} MILLONES`;
    return rest ? `${head} ${this.toWords(rest)}` : head;
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }

  /** El nombre del cliente y la direccion los tipea el cajero: van escapados. */
  private escape(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
