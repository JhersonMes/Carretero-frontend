import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CashShiftService } from '../../services/cash-shift.service';
import { KitchenSocketService } from '../../services/kitchen-socket.service';
import {
  PendingCollection,
  PendingCollectionService,
} from '../../services/pending-collection.service';
import { PaymentService } from '../../services/payment.service';
import { OrderService } from '../../services/order.service';
import { InvoiceService } from '../../services/invoice.service';
import { BusinessConfigService } from '../../services/business-config.service';
import { ReceiptService } from '../../services/receipt.service';
import { BusinessConfig } from '../../model/business-config';
import { Invoice } from '../../model/invoice';
import { PinPadComponent } from '../shared/pin-pad/pin-pad.component';
import { CashShift } from '../../model/cash-shift';
import { InvoiceType, OrderType, SunatStatus } from '../../model/enums';
import { Order } from '../../model/order';
import { Payment } from '../../model/payment';

const AMOUNT_PRESETS = [100, 200];

/**
 * Las pestanas del historial, en el orden en que se muestran. Se muestran las
 * tres siempre, aunque esten vacias, para que la barra no cambie de forma segun
 * lo que se haya vendido.
 */
/** Lo que se puede hacer sobre una venta ya cobrada. Las dos piden PIN. */
export type SaleAction = 'anular' | 'reemitir';

const SALE_TABS: { key: OrderType; label: string }[] = [
  { key: 'SALON', label: 'Salon' },
  { key: 'VENTA_RAPIDA', label: 'Venta rapida' },
  { key: 'DELIVERY', label: 'Delivery' },
];

@Component({
  selector: 'app-cash-shift',
  standalone: true,
  imports: [CommonModule, FormsModule, PinPadComponent],
  templateUrl: './cash-shift.component.html',
  styleUrl: './cash-shift.component.css',
})
export class CashShiftComponent implements OnInit, OnDestroy {
  private cashShiftService = inject(CashShiftService);
  private paymentService = inject(PaymentService);
  private orderService = inject(OrderService);
  private invoiceService = inject(InvoiceService);
  private businessConfigService = inject(BusinessConfigService);
  private receiptService = inject(ReceiptService);
  private pendingService = inject(PendingCollectionService);
  private authService = inject(AuthService);
  private kitchenSocket = inject(KitchenSocketService);
  private router = inject(Router);

  activeShift: CashShift | null = null;
  /**
   * Turno recien cerrado. Es el unico momento en que esta pantalla muestra
   * importes: hasta el cierre la caja es ciega, para que quien cuenta el dinero
   * no sepa de antemano cuanto deberia haber.
   */
  closedShift: CashShift | null = null;
  loading = true;
  errorMessage = '';

  readonly amountPresets = AMOUNT_PRESETS;

  showOpenModal = false;
  openAmount: number | null = null;
  openNotes = '';
  opening = false;

  showCloseModal = false;
  closeAmount: number | null = null;
  closeNotes = '';
  closing = false;

  /** Ventas que cobro el usuario conectado en este turno, de la ultima a la primera. */
  mySales: Payment[] = [];
  loadingSales = false;
  /** Por que no se pudo traer el historial. Vacio cuando la consulta salio bien. */
  salesError = '';

  readonly saleTabs = SALE_TABS;
  activeTab: OrderType = 'SALON';
  /** idPayment de la venta cuyo detalle esta desplegado. */
  expandedSale: number | null = null;
  /** Pedido de la venta desplegada, con sus items. */
  saleDetail: Order | null = null;
  /** Comprobante vigente de la venta abierta; null si esta anulada o no se emitio. */
  saleInvoice: Invoice | null = null;
  loadingDetail = false;
  detailError = '';
  private businessConfig: BusinessConfig | null = null;

  /** Accion que espera el PIN. null cuando el teclado esta cerrado. */
  pendingAction: SaleAction | null = null;
  /** Accion ya autorizada, con su formulario abierto. */
  authorizedAction: SaleAction | null = null;
  /** El PIN ya validado, que acompana a la operacion real. */
  private authorizedPin = '';
  actionError = '';
  pinReason = '';
  working = false;
  reissueMessage = '';
  /** Datos del comprobante a reemitir. Nunca cambia el pedido ni el total. */
  reissue: { invoiceType: InvoiceType; docNumber: string; clientName: string } = {
    invoiceType: 'BOLETA',
    docNumber: '',
    clientName: '',
  };
  /** Ventana del historial. Cerrada por defecto: la pantalla de caja es para abrir y cerrar turno. */
  showSales = false;

  /** Mesas sin cobrar; mientras quede alguna, la caja no cierra. */
  pending: PendingCollection[] = [];
  checkingPending = false;
  showPendingModal = false;

  private updatesSubscription?: Subscription;

  ngOnInit(): void {
    this.loadShift();
    this.refreshPending();

    // La cabecera de la boleta sale de la configuracion del negocio.
    this.businessConfigService.getConfig().subscribe({
      next: (config) => (this.businessConfig = config),
      error: () => (this.businessConfig = null),
    });

    // Cobrar una mesa emite el mismo evento que refresca el salon. Escucharlo
    // mantiene la lista al dia sin que el mesero tenga que recargar: si otro de
    // los que atendio la mesa la baja, aqui desaparece sola.
    this.kitchenSocket.connect();
    this.updatesSubscription = this.kitchenSocket.updates$.subscribe(() => {
      this.refreshPending();
      // La caja es una sola para todo el local: si otro la cerro, esta pantalla
      // tiene que dejar de ofrecer el cierre en vez de esperar al click fallido.
      this.loadShift(true);
    });
  }

  ngOnDestroy(): void {
    this.updatesSubscription?.unsubscribe();
    this.kitchenSocket.disconnect();
  }

  // --- Cobros pendientes ---

  get hasPending(): boolean {
    return this.pending.length > 0;
  }

  get myPending(): PendingCollection[] {
    return this.pending.filter((p) => p.mine);
  }

  get otherPending(): PendingCollection[] {
    return this.pending.filter((p) => !p.mine);
  }

  private refreshPending(): void {
    this.pendingService.loadPending(this.authService.currentUser()).subscribe((pending) => {
      this.pending = pending;
    });
  }

  /** Vuelve a consultar y, si ya no queda nada, pasa directo al cierre. */
  recheckPending(): void {
    this.checkingPending = true;
    this.pendingService.loadPending(this.authService.currentUser()).subscribe((pending) => {
      this.pending = pending;
      this.checkingPending = false;
      if (!pending.length) {
        this.showPendingModal = false;
        this.openCloseModal();
      }
    });
  }

  closePendingModal(): void {
    this.showPendingModal = false;
  }

  goToTable(item: PendingCollection): void {
    this.showPendingModal = false;
    this.router.navigate(['/pages/salon', item.idTable]);
  }

  /**
   * @param silent no muestra el "Cargando": se usa en los refrescos automaticos,
   *        donde parpadear la pantalla entera seria peor que no avisar nada.
   */
  loadShift(silent = false): void {
    this.loading = !silent;
    this.cashShiftService.getActiveShift().subscribe({
      next: (shift) => {
        this.activeShift = shift;
        this.loading = false;
        this.loadMySales(shift?.idCashShift);
      },
      error: () => {
        this.activeShift = null;
        this.loading = false;
        if (!this.closedShift) this.mySales = [];
      },
    });
  }

  // --- Mis ultimas ventas ---

  /**
   * Ventas que cobro el propio usuario desde que se aperturo esta caja.
   *
   * Se consultan por turno y no por fecha: un turno puede cruzar la medianoche, y
   * dos turnos del mismo dia no deben mezclar sus ventas. Quien las hizo lo
   * resuelve el backend con la sesion, asi que aqui nunca llegan las de otro.
   */
  private loadMySales(idCashShift: number | undefined): void {
    if (!idCashShift) {
      this.mySales = [];
      return;
    }
    this.loadingSales = true;
    this.salesError = '';
    this.paymentService.findMineByShift(idCashShift).subscribe({
      next: (payments) => {
        this.mySales = payments;
        this.loadingSales = false;
      },
      // Sin este aviso, una consulta que falla se veria igual que un turno sin
      // ventas, y el cajero creeria que sus cobros no se registraron.
      error: (err) => {
        this.mySales = [];
        this.loadingSales = false;
        this.salesError =
          (err as { message?: string })?.message ||
          'No se pudo consultar el historial de ventas.';
      },
    });
  }

  /**
   * Abre el historial en su propia ventana. Se vuelve a consultar al abrirlo
   * para no mostrar una lista vieja si se cobro algo desde otra pantalla.
   */
  openSales(): void {
    this.showSales = true;
    this.expandedSale = null;
    this.saleDetail = null;
    this.loadMySales(this.activeShift?.idCashShift ?? this.closedShift?.idCashShift);
  }

  closeSales(): void {
    this.showSales = false;
  }

  selectTab(tab: OrderType): void {
    this.activeTab = tab;
    // El detalle abierto pertenece a la pestana que se deja: se cierra al cambiar.
    this.expandedSale = null;
    this.saleDetail = null;
  }

  /** Las ventas de la pestana abierta. */
  get visibleSales(): Payment[] {
    return this.mySales.filter((p) => p.saleType === this.activeTab);
  }

  countOf(tab: OrderType): number {
    return this.mySales.filter((p) => p.saleType === tab).length;
  }

  /**
   * Abre o cierra el detalle de una venta. El pedido se pide al abrirlo y no
   * junto con la lista: traer el detalle de todas las ventas del turno seria
   * cargar decenas de pedidos que casi nunca se miran.
   */
  toggleSale(payment: Payment): void {
    if (this.expandedSale === payment.idPayment) {
      this.expandedSale = null;
      this.saleDetail = null;
      return;
    }

    this.expandedSale = payment.idPayment;
    this.saleDetail = null;
    this.detailError = '';

    if (!payment.idOrder) {
      this.detailError = 'Esta venta no tiene un pedido asociado.';
      return;
    }

    this.loadDetail(payment.idOrder);
  }

  /**
   * Trae el pedido y su comprobante vigente.
   *
   * Los datos del comprador se leen del comprobante y no del pedido: si la venta
   * se reemitio para agregarle el DNI o pasarla a factura, el pedido sigue igual
   * y solo el comprobante refleja la correccion.
   */
  private loadDetail(idOrder: number): void {
    this.loadingDetail = true;
    this.saleInvoice = null;

    this.orderService.findById(idOrder).subscribe({
      next: (order) => {
        this.saleDetail = order;
        this.loadingDetail = false;
      },
      error: (err) => {
        this.loadingDetail = false;
        this.detailError =
          (err as { message?: string })?.message || 'No se pudo cargar el pedido.';
      },
    });

    // Una venta anulada, o una que fallo al emitir, puede no tener comprobante
    // vigente: eso no es un error del detalle.
    this.invoiceService.findByOrder(idOrder).subscribe({
      next: (invoice) => (this.saleInvoice = invoice),
      error: () => (this.saleInvoice = null),
    });
  }

  /** Vuelve a leer el detalle abierto; se usa despues de reemitir. */
  private reloadDetail(): void {
    const idOrder = this.selectedSale?.idOrder;
    if (idOrder) this.loadDetail(idOrder);
  }

  /**
   * Descarga la boleta de una venta ya cobrada, se haya generado o no en su
   * momento: se abre en su propia pagina con el boton de guardar en PDF.
   */
  downloadReceipt(): void {
    if (!this.saleDetail) return;
    const sale = this.selectedSale;
    const user = this.authService.currentUser();

    this.receiptService.open(
      this.receiptService.buildFromOrder({
        business: this.businessConfig,
        order: this.saleDetail,
        invoice: this.saleInvoice,
        paymentMethod: sale?.paymentMethod?.name,
        cashier: user?.fullName || user?.username,
      })
    );
  }

  /**
   * Rotulo del estado SUNAT del comprobante.
   *
   * Se escriben en el idioma del cajero, no con el nombre del enum: quien mira
   * esta pantalla necesita saber si el documento esta declarado, y "SIMULADO"
   * a secas no se lo dice.
   */
  private readonly sunatLabels: Record<SunatStatus, string> = {
    NO_ENVIADO: 'Sin enviar',
    SIMULADO: 'No enviado a SUNAT',
    PENDIENTE: 'Pendiente de envio',
    ACEPTADO: 'Aceptado por SUNAT',
    RECHAZADO: 'Rechazado por SUNAT',
    ANULADO: 'Anulado',
  };

  sunatLabel(status?: SunatStatus): string {
    return status ? this.sunatLabels[status] : 'Sin estado';
  }

  /**
   * Color del distintivo. Solo ACEPTADO va en verde: es el unico estado en el
   * que SUNAT respondio conforme. Todo lo demas queda en gris o en rojo para que
   * un comprobante sin declarar no se lea como uno resuelto.
   */
  sunatClass(status?: SunatStatus): string {
    switch (status) {
      case 'ACEPTADO':
        return 'ok';
      case 'RECHAZADO':
        return 'bad';
      case 'PENDIENTE':
        return 'wait';
      default:
        return 'idle';
    }
  }

  get mySalesTotal(): number {
    return this.mySales.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  }

  /**
   * El total de lo cobrado se destapa recien con la caja cerrada. El importe de
   * cada venta si se ve: es una boleta que el mismo acaba de emitir. Lo que la
   * caja ciega protege es el acumulado, para que el conteo no se cuadre de
   * antemano.
   */
  get showsSalesTotal(): boolean {
    return !!this.closedShift;
  }

  /** Nombre de la mesa cuando la venta vino del salon. */
  tableOf(payment: Payment): string {
    return payment.saleType === 'SALON' ? payment.tableName || 'Mesa' : '';
  }

  isCancelled(payment: Payment): boolean {
    return payment.orderStatus === 'CANCELADO';
  }

  // --- Anular y reemitir ---

  /** La venta que se esta mirando en el detalle. */
  get selectedSale(): Payment | null {
    return this.mySales.find((p) => p.idPayment === this.expandedSale) ?? null;
  }

  /** Una venta ya anulada no admite ni otra anulacion ni otro comprobante. */
  get canActOnSale(): boolean {
    const sale = this.selectedSale;
    return !!sale && !this.isCancelled(sale);
  }

  /** Lo que se va a autorizar, para que se lea antes de teclear el PIN. */
  get pinSubtitle(): string {
    const sale = this.selectedSale;
    const what = this.pendingAction === 'anular' ? 'Anular' : 'Editar el comprobante de';
    return `${what} ${sale?.orderCode ?? ''} - S/ ${Number(sale?.amount ?? 0).toFixed(2)}`;
  }

  /**
   * Pide el PIN antes de abrir la accion.
   *
   * Va primero y no al confirmar para que nadie llene un formulario entero y
   * recien ahi se entere de que no tiene autorizacion.
   */
  askPin(action: SaleAction): void {
    this.pendingAction = action;
    this.authorizedAction = null;
  }

  cancelPin(): void {
    this.pendingAction = null;
  }

  /** El teclado ya comprobo el PIN; la operacion lo vuelve a validar al usarlo. */
  onPinAuthorized(pin: string): void {
    this.authorizedPin = pin;
    this.authorizedAction = this.pendingAction;
    this.pendingAction = null;
    this.openActionForm();
  }

  private openActionForm(): void {
    this.actionError = '';
    this.pinReason = '';
    this.working = false;
    // Al reemitir se parte de lo que ya tiene la venta y se corrige encima.
    this.reissue = {
      invoiceType: 'BOLETA',
      docNumber: this.saleDetail?.client?.docNumber ?? '',
      clientName: this.saleDetail?.client?.name ?? '',
    };
  }

  cancelAction(): void {
    this.authorizedAction = null;
    this.authorizedPin = '';
    this.actionError = '';
  }

  confirmAction(): void {
    if (this.authorizedAction === 'anular') this.doCancel();
    else if (this.authorizedAction === 'reemitir') this.doReissue();
  }

  private doCancel(): void {
    const sale = this.selectedSale;
    if (!sale?.idOrder) {
      this.actionError = 'Esta venta no tiene un pedido asociado.';
      return;
    }

    this.working = true;
    this.actionError = '';
    this.orderService.cancelOrder(sale.idOrder, this.authorizedPin, this.pinReason).subscribe({
      next: () => {
        this.working = false;
        this.cancelAction();
        this.expandedSale = null;
        this.saleDetail = null;
        // La anulacion cambia los totales del turno: se recargan turno y ventas.
        this.loadShift(true);
      },
      error: (err) => {
        this.working = false;
        this.actionError = (err as { message?: string })?.message || 'No se pudo anular la venta.';
      },
    });
  }

  private doReissue(): void {
    const sale = this.selectedSale;
    if (!sale?.idOrder) {
      this.actionError = 'Esta venta no tiene un pedido asociado.';
      return;
    }

    const doc = this.reissue.docNumber.trim();
    if (this.reissue.invoiceType === 'FACTURA' && doc.length !== 11) {
      this.actionError = 'Para emitir una factura se necesita un RUC de 11 digitos.';
      return;
    }

    this.working = true;
    this.actionError = '';
    this.invoiceService
      .reissueInvoice(
        {
          idOrder: sale.idOrder,
          invoiceType: this.reissue.invoiceType,
          docType: this.reissue.invoiceType === 'FACTURA' ? 'RUC' : doc ? 'DNI' : 'SIN_DOC',
          docNumber: doc || undefined,
          clientName: this.reissue.clientName.trim() || undefined,
        },
        this.authorizedPin
      )
      .subscribe({
        next: (invoice) => {
          this.working = false;
          this.cancelAction();
          this.reissueMessage = `Comprobante reemitido: ${invoice.fullNumber}.`;
          // El detalle en pantalla quedo con el comprobante viejo: se relee para
          // que se vea el nuevo numero y el cliente corregido.
          this.reloadDetail();
        },
        error: (err) => {
          this.working = false;
          this.actionError =
            (err as { message?: string })?.message || 'No se pudo reemitir el comprobante.';
        },
      });
  }

  // --- Apertura de caja ---

  /** El signo ya lo comunica la etiqueta (sobrante/faltante); aqui va la magnitud. */
  absDifference(shift: CashShift): number {
    return Math.abs(shift.difference ?? 0);
  }

  /** Descarta el reporte del cierre para volver a la pantalla normal de caja. */
  dismissClosedReport(): void {
    this.closedShift = null;
    this.mySales = [];
    this.showSales = false;
  }

  openOpenModal(): void {
    this.closedShift = null;
    this.openAmount = null;
    this.openNotes = '';
    this.errorMessage = '';
    this.showOpenModal = true;
  }

  closeOpenModal(): void {
    this.showOpenModal = false;
  }

  pickPresetAmount(amount: number): void {
    this.openAmount = amount;
  }

  confirmOpenShift(): void {
    if (!this.openAmount || this.openAmount <= 0) {
      this.errorMessage = 'Ingresa un monto valido para aperturar la caja.';
      return;
    }

    this.opening = true;
    this.cashShiftService.openShift(this.openAmount, this.openNotes || undefined).subscribe({
      next: (shift) => {
        this.activeShift = shift;
        this.opening = false;
        this.showOpenModal = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudo aperturar la caja.';
        this.opening = false;
      },
    });
  }

  // --- Cierre de caja ---

  /**
   * Puerta de entrada al cierre. Vuelve a consultar los cobros pendientes en vez
   * de confiar en lo que ya tenia en pantalla: entre que se cargo la pagina y el
   * mesero pulsa el boton, otro pudo cobrar la mesa compartida (y entonces ya no
   * hay nada que bloquear) o abrir una nueva.
   */
  requestClose(): void {
    this.errorMessage = '';
    this.checkingPending = true;
    this.pendingService.loadPending(this.authService.currentUser()).subscribe((pending) => {
      this.pending = pending;
      this.checkingPending = false;
      if (pending.length) {
        this.showPendingModal = true;
        return;
      }
      this.openCloseModal();
    });
  }

  openCloseModal(): void {
    this.closeAmount = null;
    this.closeNotes = '';
    this.errorMessage = '';
    this.showCloseModal = true;
  }

  closeCloseModal(): void {
    this.showCloseModal = false;
  }

  confirmCloseShift(): void {
    if (!this.activeShift?.idCashShift) return;
    if (this.closeAmount === null || this.closeAmount < 0) {
      this.errorMessage = 'Ingresa el monto contado en caja.';
      return;
    }

    this.closing = true;
    this.cashShiftService
      .closeShift(this.activeShift.idCashShift, this.closeAmount, this.closeNotes || undefined)
      .subscribe({
        next: (closed) => {
          this.activeShift = null;
          this.closedShift = closed;
          this.closing = false;
          this.showCloseModal = false;
          // Con la caja cerrada el detalle ya puede mostrar importes, asi que se
          // vuelve a pedir por si entro algun cobro entre la carga y el cierre.
          this.loadMySales(closed.idCashShift);
        },
        error: (err) => {
          this.errorMessage = err?.message || 'No se pudo cerrar la caja.';
          this.closing = false;

          // El backend valida lo mismo que esta pantalla y es el que manda. Si
          // rechazo el cierre, lo que se ve aqui quedo viejo: puede que alguien
          // haya abierto otra mesa, o que ya haya cerrado la caja el mismo. Se
          // recarga todo para que la pantalla vuelva a reflejar la realidad.
          this.loadShift();
          this.refreshPending();
        },
      });
  }
}
