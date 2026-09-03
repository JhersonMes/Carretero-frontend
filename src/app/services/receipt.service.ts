import { Injectable } from '@angular/core';
import { Address } from '../model/address';
import { BusinessConfig } from '../model/business-config';
import { Invoice } from '../model/invoice';
import { Order } from '../model/order';

/** Una linea de la boleta tal como se imprime, ya sin depender del carrito. */
export interface ReceiptLine {
  name: string;
  option?: string;
  quantity: number;
  /** Precio unitario de venta, con IGV incluido (es como se cotiza en carta). */
  unitPrice: number;
}

export interface ReceiptData {
  business: BusinessConfig | null;
  /** Numero del comprobante emitido (ej. B001-00000001). */
  invoiceNumber?: string;
  /** BOLETA, FACTURA o NOTA_VENTA. */
  invoiceType?: string;
  orderCode: string;
  issuedAt: Date;
  /** De donde salio la venta: "Mesa 3", "Venta rapida", "Delivery". */
  origin?: string;
  clientName: string;
  clientDocType?: string;
  clientDoc?: string;
  clientPhone?: string;
  /** Jiron / calle del reparto. Solo lo llevan las ventas de delivery. */
  addressLine?: string;
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
 * Comprobantes de venta: boleta, factura y nota de venta.
 *
 * Sigue la forma de un comprobante peruano: los precios de carta ya incluyen el
 * IGV, asi que el impuesto no se suma al final sino que se desagrega del total
 * (base = total / 1.18), el mismo calculo que hace el backend al emitirlo.
 * Ademas del detalle lleva el importe en letras, obligatorio en un comprobante
 * de pago.
 *
 * Hay dos formatos, y ninguno sirve para lo del otro:
 *  - `print()` saca el ticket de 80mm, el que sale por la ticketera.
 *  - `open()` abre la boleta virtual en A4, con logo, para verla en pantalla,
 *    mandarla al cliente o guardarla en PDF.
 *
 * En los dos casos el PDF lo produce el propio navegador con "Guardar como
 * PDF": no hace falta ninguna libreria extra ni que el backend genere binarios.
 */
@Injectable({ providedIn: 'root' })
export class ReceiptService {
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
   * Arma la boleta a partir del pedido y su comprobante.
   *
   * Vive aqui y no en cada pantalla porque las tres que emiten boleta (salon,
   * venta rapida y delivery) tienen que producir exactamente el mismo documento:
   * si cada una lo armara por su cuenta, tarde o temprano una imprimiria el IGV
   * o el cliente distinto que las otras.
   */
  buildFromOrder(params: {
    business: BusinessConfig | null;
    order: Order;
    invoice?: Invoice | null;
    paymentMethod?: string;
    cashier?: string;
  }): ReceiptData {
    const { business, order, invoice, paymentMethod, cashier } = params;
    const total = Number(order.total ?? 0);
    const fallback = this.breakdown(total);

    // Los datos del comprador salen del comprobante: es el que vale, y puede
    // haberse corregido despues de la venta al reemitirlo.
    const client = invoice?.client ?? order.client;

    return {
      business,
      invoiceNumber: invoice?.fullNumber,
      invoiceType: invoice?.invoiceType,
      orderCode: order.orderCode ?? '',
      issuedAt: invoice?.issueDate ? new Date(invoice.issueDate) : new Date(),
      origin: this.originOf(order),
      clientName: client?.name ?? 'Cliente varios',
      clientDocType: client?.docNumber ? client.docType : undefined,
      clientDoc: client?.docNumber,
      clientPhone: client?.phone,
      addressLine: order.deliveryAddress ? this.addressLine(order.deliveryAddress) : undefined,
      addressReference: order.deliveryAddress?.reference,
      lines: (order.details ?? []).map((d) => ({
        name: d.productName,
        option: d.flavorName,
        quantity: d.quantity,
        unitPrice: Number(d.unitPrice ?? 0),
      })),
      subtotal: Number(order.subtotal ?? 0),
      deliveryFee: Number(order.deliveryFee ?? 0),
      taxableAmount: Number(invoice?.taxableAmount ?? fallback.taxableAmount),
      igvAmount: Number(invoice?.igvAmount ?? fallback.igvAmount),
      total,
      paymentMethod,
      cashier,
      qrData: invoice?.qrData,
    };
  }

  private originOf(order: Order): string {
    if (order.saleType === 'SALON') return order.table?.name ?? 'Salon';
    if (order.saleType === 'DELIVERY') return 'Delivery';
    return 'Venta rapida';
  }

  private addressLine(address: Address): string {
    const parts = [address.street];
    if (address.number) parts.push(address.number);
    const line = parts.join(' ');
    return address.district ? `${line}, ${address.district}` : line;
  }

  private docTitle(data: ReceiptData): string {
    if (data.invoiceType === 'FACTURA') return 'Factura electronica';
    if (data.invoiceType === 'NOTA_VENTA') return 'Nota de venta';
    return 'Boleta de venta electronica';
  }

  /**
   * Boleta virtual: se abre en su propia pestana, en formato A4 y con el logo.
   *
   * Va como blob y no escribiendo sobre la ventana con document.write. Una
   * ventana escrita asi queda atada a la pagina que la abrio, y al imprimir el
   * dialogo bloqueaba tambien el sistema, que se quedaba sin aceptar clics. El
   * blob es un documento independiente: su dialogo de impresion es solo suyo.
   */
  open(data: ReceiptData): void {
    const url = URL.createObjectURL(
      new Blob([this.buildA4Html(data)], { type: 'text/html' })
    );

    const win = window.open(url, '_blank');
    if (!win) {
      // Ventana emergente bloqueada: al menos que salga por el dialogo de
      // impresion, que nunca se bloquea. Peor seria quedarse sin boleta.
      URL.revokeObjectURL(url);
      this.print(data);
      return;
    }

    // Se corta el vinculo con la pestana que la abrio: la boleta no necesita
    // hablar con el sistema, y sin ese lazo no puede interferirlo.
    win.opener = null;

    // El blob vive hasta que la pestana termine de cargarlo.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  /**
   * Manda el ticket de 80mm al dialogo de impresion. Usa un iframe oculto y no
   * una ventana nueva porque los bloqueadores de popups impiden abrirla y el
   * cajero se quedaria sin ticket sin saber por que.
   */
  print(data: ReceiptData): void {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.srcdoc = this.buildTicketHtml(data);

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

  /**
   * Boleta en 80mm, la que sale por la ticketera.
   *
   * Es un formato distinto del A4 a proposito: en el rollo hay una sola columna
   * y no entran ni el logo ni una tabla con columnas, mientras que en una hoja
   * A4 ese mismo ticket se ve como una tira diminuta en la esquina.
   */
  private buildTicketHtml(data: ReceiptData): string {
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

    <div class="doc-type">${this.escape(this.docTitle(data))}</div>
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
  ${data.origin ? `<div class="field"><span>Origen</span><span>${this.escape(data.origin)}</span></div>` : ''}
  ${data.addressLine
      ? `<div class="field"><span>Direccion</span><span>${this.escape(data.addressLine)}</span></div>`
      : ''}
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
    ${data.addressLine ? `<div>Delivery a ${this.escape(data.addressLine)}</div>` : ''}
    ${data.qrData ? `<div class="qr">${this.escape(data.qrData)}</div>` : ''}
  </div>
</body>
</html>`;
  }

  /**
   * Boleta virtual en A4: la que se ve en pantalla, se manda por WhatsApp o se
   * guarda en PDF. Aprovecha el ancho de la hoja, lleva el logo y separa el
   * precio unitario del importe, cosas que en el rollo de 80mm no entran.
   */
  private buildA4Html(data: ReceiptData): string {
    const b = data.business;
    const money = (value: number) => `S/ ${Number(value ?? 0).toFixed(2)}`;
    // Logo completo (anillo + fogata + wordmark) en su version para papel. El
    // favicon no sirve aqui: es un recorte pensado para 16 pixeles y en una hoja
    // se ve como un circulo rojo con una chispa dentro.
    const logo = `${window.location.origin}/assets/logo-carretero.svg`;

    const items = data.lines
      .map(
        (line) => `
          <tr>
            <td class="c">${line.quantity}</td>
            <td>
              ${this.escape(line.name)}
              ${line.option ? `<span class="opt">${this.escape(line.option)}</span>` : ''}
            </td>
            <td class="r">${money(line.unitPrice)}</td>
            <td class="r">${money(line.unitPrice * line.quantity)}</td>
          </tr>`
      )
      .join('');

    const field = (label: string, value?: string) =>
      value ? `<div class="field"><span>${label}</span><span>${this.escape(value)}</span></div>` : '';

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${this.escape(data.invoiceNumber || data.orderCode)}</title>
<style>
  /*
    Margen cero a proposito. El navegador dibuja su cabecera y su pie (titulo,
    fecha y la URL, que en la boleta salia como "blob:http://localhost...") en
    ese margen: sin margen no tiene donde escribirlos. El aire de la hoja lo
    pone el padding de .sheet al imprimir.
  */
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    background: #f4f1ee;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #241f1f;
  }
  .sheet {
    max-width: 190mm;
    margin: 0 auto;
    padding: 26px 30px 34px;
    background: #fff;
    border-radius: 6px;
    box-shadow: 0 6px 24px rgba(0,0,0,.12);
  }
  .toolbar { max-width: 190mm; margin: 0 auto 14px; display: flex; gap: 10px; }
  .toolbar button {
    flex: 1; padding: 12px; font: inherit; font-weight: 700; cursor: pointer;
    border: 1.5px solid #e31b22; border-radius: 6px; background: #e31b22; color: #fff;
  }
  .toolbar button.ghost { background: #fff; color: #e31b22; }

  .head { display: flex; align-items: flex-start; gap: 20px; }
  .brand { flex: 1; }
  .brand img { width: 190px; height: auto; display: block; margin-bottom: 8px; }
  .brand-line { font-size: 11px; color: #6b6462; line-height: 1.6; }
  .brand-line strong { color: #241f1f; }
  .doc-box {
    width: 210px; padding: 10px 12px; text-align: center;
    border: 2px solid #241f1f; border-radius: 6px;
  }
  .doc-box .type { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
  .doc-box .ruc { font-size: 11px; color: #6b6462; margin: 2px 0 4px; }
  .doc-box .number { font-size: 17px; font-weight: 800; }

  hr { border: none; border-top: 1px solid #e4dfda; margin: 18px 0; }

  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .field { display: flex; gap: 10px; font-size: 12px; }
  .field span:first-child { min-width: 78px; font-weight: 700; color: #6b6462; }
  .field span:last-child { flex: 1; }

  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  thead th {
    padding: 8px 10px; background: #241f1f; color: #fff;
    font-size: 10px; text-transform: uppercase; letter-spacing: .06em; text-align: left;
  }
  tbody td { padding: 9px 10px; border-bottom: 1px solid #e4dfda; font-size: 12.5px; vertical-align: top; }
  th.c, td.c { width: 56px; text-align: center; }
  th.r, td.r { width: 110px; text-align: right; }
  .opt { display: block; font-size: 11px; font-style: italic; color: #e31b22; }

  .bottom { display: flex; gap: 24px; margin-top: 18px; }
  .words {
    flex: 1; padding: 12px 14px; background: #f4f1ee; border-radius: 6px;
    font-size: 11.5px; font-weight: 700; text-transform: uppercase; align-self: flex-start;
  }
  .totals { width: 260px; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12.5px; color: #6b6462; }
  .total-row.grand {
    margin-top: 6px; padding-top: 10px; border-top: 2px solid #241f1f;
    font-size: 19px; font-weight: 800; color: #241f1f;
  }

  .foot { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e4dfda; font-size: 10.5px; color: #6b6462; }
  .qr { margin-top: 6px; word-break: break-all; font-family: monospace; font-size: 9.5px; }

  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border-radius: 0; padding: 14mm; max-width: none; }
    .toolbar { display: none; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
    <button type="button" class="ghost" onclick="window.close()">Cerrar</button>
  </div>

  <div class="sheet">
    <div class="head">
      <div class="brand">
        <img src="${logo}" alt="${this.escape(b?.commercialName || 'El Carretero')}" />
        <div class="brand-line">
          ${b?.businessName ? `<strong>${this.escape(b.businessName)}</strong><br />` : ''}
          ${b?.address ? `${this.escape(b.address)}<br />` : ''}
          ${b?.phone ? `Tel. ${this.escape(b.phone)}` : ''}
        </div>
      </div>
      <div class="doc-box">
        <div class="type">${this.escape(this.docTitle(data))}</div>
        <div class="ruc">${b?.ruc ? `RUC ${this.escape(b.ruc)}` : ''}</div>
        <div class="number">${this.escape(data.invoiceNumber || data.orderCode)}</div>
      </div>
    </div>

    <hr />

    <div class="fields">
      ${field('Emision', this.formatDate(data.issuedAt))}
      ${field('Pedido', data.orderCode)}
      ${field('Cliente', data.clientName)}
      ${field(data.clientDocType || 'Documento', data.clientDoc)}
      ${field('Origen', data.origin)}
      ${field('Telefono', data.clientPhone)}
      ${field('Direccion', data.addressLine)}
      ${field('Referencia', data.addressReference)}
      ${field('Atendio', data.cashier)}
      ${field('Pago', data.paymentMethod)}
    </div>

    <table>
      <thead>
        <tr>
          <th class="c">Cant</th>
          <th>Descripcion</th>
          <th class="r">P. unit</th>
          <th class="r">Importe</th>
        </tr>
      </thead>
      <tbody>${items}</tbody>
    </table>

    <div class="bottom">
      <div class="words">${this.amountInWords(data.total)}</div>
      <div class="totals">
        <div class="total-row"><span>Consumo</span><span>${money(data.subtotal)}</span></div>
        ${data.deliveryFee
          ? `<div class="total-row"><span>Delivery</span><span>${money(data.deliveryFee)}</span></div>`
          : ''}
        <div class="total-row"><span>Op. gravada</span><span>${money(data.taxableAmount)}</span></div>
        <div class="total-row"><span>IGV (${(IGV_RATE * 100).toFixed(0)}%)</span><span>${money(data.igvAmount)}</span></div>
        <div class="total-row grand"><span>Total</span><span>${money(data.total)}</span></div>
      </div>
    </div>

    <div class="foot">
      Los precios incluyen IGV. Gracias por su compra.
      ${data.qrData ? `<div class="qr">${this.escape(data.qrData)}</div>` : ''}
    </div>
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
