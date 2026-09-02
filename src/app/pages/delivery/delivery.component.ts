import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BusinessConfigService } from '../../services/business-config.service';
import { CashShiftService } from '../../services/cash-shift.service';
import { CategoryService } from '../../services/category.service';
import { ClientService } from '../../services/client.service';
import {
  BOLETA_DNI_THRESHOLD,
  DeliveryReceiptData,
  DeliveryReceiptService,
  ReceiptLine,
} from '../../services/delivery-receipt.service';
import { AddressService } from '../../services/address.service';
import { InvoiceService } from '../../services/invoice.service';
import { OrderService } from '../../services/order.service';
import { PaymentMethodService } from '../../services/payment-method.service';
import { PaymentService } from '../../services/payment.service';
import { ProductService } from '../../services/product.service';
import { Address } from '../../model/address';
import { BusinessConfig } from '../../model/business-config';
import { CashShift } from '../../model/cash-shift';
import { Category } from '../../model/category';
import { Client } from '../../model/client';
import { Flavor } from '../../model/flavor';
import { Invoice } from '../../model/invoice';
import { Order } from '../../model/order';
import { OrderCreateRequest } from '../../model/order-create-request';
import { PaymentMethod } from '../../model/payment-method';
import { Product } from '../../model/product';
import { FlavorModalComponent } from '../shared/flavor-modal/flavor-modal.component';

interface CartLine {
  product: Product;
  quantity: number;
  /** Opcion elegida; dos lineas del mismo producto con distinta opcion no se agrupan. */
  flavor?: Flavor;
  /** Precio unitario ya con el ajuste de la opcion aplicado. */
  unitPrice: number;
}

/** Datos del cliente, tanto para darlo de alta como para corregirlos despues. */
interface ClientForm {
  name: string;
  phone: string;
  docNumber: string;
}

/** Direccion en edicion. Sin idAddress es una direccion nueva. */
interface AddressForm {
  idAddress?: number;
  street: string;
  district: string;
  reference: string;
  deliveryFee: number;
  favorite: boolean;
}

/** En que parte del flujo esta el cajero: primero el cliente, luego su pedido. */
type Step = 'cliente' | 'pedido';

/** Largo maximo de un telefono peruano: los celulares tienen 9 digitos. */
const PHONE_MAX_DIGITS = 9;
/** Un fijo con codigo de area no baja de esto; menos que eso es un numero incompleto. */
const PHONE_MIN_DIGITS = 6;
const DNI_DIGITS = 8;

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FlavorModalComponent],
  templateUrl: './delivery.component.html',
  styleUrl: './delivery.component.css',
})
export class DeliveryComponent implements OnInit {
  private clientService = inject(ClientService);
  private addressService = inject(AddressService);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private orderService = inject(OrderService);
  private invoiceService = inject(InvoiceService);
  private cashShiftService = inject(CashShiftService);
  private paymentMethodService = inject(PaymentMethodService);
  private paymentService = inject(PaymentService);
  private businessConfigService = inject(BusinessConfigService);
  private receiptService = inject(DeliveryReceiptService);
  private authService = inject(AuthService);

  readonly phoneMaxDigits = PHONE_MAX_DIGITS;
  readonly dniDigits = DNI_DIGITS;
  readonly boletaDniThreshold = BOLETA_DNI_THRESHOLD;

  step: Step = 'cliente';

  // --- Cliente ---
  clients: Client[] = [];
  loadingClients = true;
  query = '';
  /** true mientras se llena el alta de un cliente que todavia no existe. */
  registering = false;
  form: ClientForm = this.blankForm();
  /** Primera direccion del cliente nuevo; se pide junto con sus datos. */
  firstAddress: AddressForm = this.blankAddress();
  savingClient = false;
  clientError = '';

  /**
   * Cliente que ya tiene el documento que se esta tecleando. El documento
   * identifica a una sola persona, asi que en vez de dejar crear una ficha
   * repetida se ofrece atender a la que ya existe.
   */
  duplicateClient: Client | null = null;

  selectedClient: Client | null = null;
  addresses: Address[] = [];
  selectedAddress: Address | null = null;

  /** Datos del cliente en edicion; null cuando no se esta editando. */
  editingClient: ClientForm | null = null;
  /** Direccion en alta o edicion; null cuando el formulario esta cerrado. */
  addressForm: AddressForm | null = null;
  savingAddress = false;

  // --- Pedido ---
  categories: Category[] = [];
  products: Product[] = [];
  selectedCategory: Category | null = null;
  cart: CartLine[] = [];
  pendingFlavorProduct: Product | null = null;
  /** Lo que se cobra por el reparto en esta venta; arranca en la tarifa del jiron. */
  deliveryFee = 0;

  activeShift: CashShift | null = null;
  checkingShift = true;
  paymentMethods: PaymentMethod[] = [];
  selectedMethodId: number | null = null;

  /**
   * Pedido ya creado cuyo cobro fallo. Se guarda para reintentar solo el pago:
   * volver a pulsar el boton no debe generar un segundo pedido por lo mismo.
   */
  pendingPaymentOrder: Order | null = null;

  sending = false;
  errorMessage = '';
  successMessage = '';

  /** Boleta del ultimo pedido cobrado, lista para imprimirse en PDF. */
  receipt: DeliveryReceiptData | null = null;
  private businessConfig: BusinessConfig | null = null;

  /**
   * Copia de las lineas con las que se envio el pedido. Se guarda aparte porque
   * el carrito se vacia al enviar, y un cobro que falla y se reintenta despues
   * imprimiria una boleta sin detalle.
   */
  private sentLines: ReceiptLine[] = [];

  ngOnInit(): void {
    this.loadClients();
    this.loadShiftStatus();

    this.categoryService.findAllActive().subscribe((data) => {
      this.categories = data;
      if (data.length > 0) {
        this.selectCategory(data[0]);
      }
    });

    this.paymentMethodService.findAll().subscribe((methods) => {
      this.paymentMethods = methods;
      this.selectedMethodId = methods[0]?.idPaymentMethod ?? null;
    });

    // La cabecera de la boleta sale de la configuracion del negocio. Si no se
    // puede leer, la boleta igual se emite con el nombre por defecto.
    this.businessConfigService.getConfig().subscribe({
      next: (config) => (this.businessConfig = config),
      error: () => (this.businessConfig = null),
    });
  }

  // ===================== Cliente =====================

  loadClients(): void {
    this.loadingClients = true;
    this.clientService.findAll().subscribe({
      next: (data) => {
        this.clients = data;
        this.loadingClients = false;
        // Sin nadie en el padron, buscar no tiene sentido: se abre el alta.
        if (data.length === 0) this.registering = true;
      },
      error: () => {
        this.clients = [];
        this.loadingClients = false;
        this.clientError = 'No se pudo cargar el padron de clientes.';
      },
    });
  }

  get hasClients(): boolean {
    return this.clients.length > 0;
  }

  get results(): Client[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.clients;
    return this.clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.docNumber ?? '').toLowerCase().includes(q)
    );
  }

  /**
   * Deja solo digitos y corta en 9. Un telefono peruano no tiene mas, y guardarlo
   * limpio es lo que permite despues encontrar al cliente tecleando su numero.
   *
   * Se corrige tambien lo que se ve en el campo: si solo se limpiara el modelo,
   * el cajero seguiria leyendo en pantalla los caracteres que se descartaron.
   */
  onPhoneInput(event: Event, target: ClientForm): void {
    target.phone = this.sanitizeDigits(event, PHONE_MAX_DIGITS);
  }

  onDocInput(event: Event, target: ClientForm): void {
    target.docNumber = this.sanitizeDigits(event, DNI_DIGITS);
    this.duplicateClient = null;
  }

  /** Ficha que ya usa ese documento, sin contar al cliente que se esta editando. */
  private clientWithDoc(doc: string, idToIgnore?: number): Client | undefined {
    if (!doc) return undefined;
    return this.clients.find((c) => c.docNumber === doc && c.idClient !== idToIgnore);
  }

  /** Atiende al cliente que ya tenia ese documento en vez de duplicarlo. */
  useDuplicate(): void {
    const client = this.duplicateClient;
    if (!client) return;
    this.duplicateClient = null;
    this.clientError = '';
    this.registering = false;
    this.editingClient = null;
    this.selectClient(client);
  }

  private sanitizeDigits(event: Event, maxLength: number): string {
    const input = event.target as HTMLInputElement;
    const clean = (input.value ?? '').replace(/\D/g, '').slice(0, maxLength);
    if (input.value !== clean) input.value = clean;
    return clean;
  }

  /** Mensaje de por que el telefono no sirve, o cadena vacia si esta bien. */
  private phoneProblem(phone: string): string {
    const digits = (phone ?? '').trim();
    if (!digits) return 'Anota el numero de contacto: es con lo que se le ubica.';
    if (!/^\d+$/.test(digits)) return 'El telefono solo lleva numeros.';
    if (digits.length > PHONE_MAX_DIGITS) {
      return `Un telefono peruano tiene como maximo ${PHONE_MAX_DIGITS} digitos.`;
    }
    // Todo celular peruano empieza en 9 y tiene los 9 digitos completos.
    if (digits.startsWith('9') && digits.length !== PHONE_MAX_DIGITS) {
      return `El celular esta incompleto: son ${PHONE_MAX_DIGITS} digitos.`;
    }
    if (digits.length < PHONE_MIN_DIGITS) return 'El numero esta incompleto.';
    return '';
  }

  private docProblem(doc: string): string {
    const digits = (doc ?? '').trim();
    if (!digits) return '';
    if (!/^\d+$/.test(digits) || digits.length !== DNI_DIGITS) {
      return `El DNI tiene ${DNI_DIGITS} digitos.`;
    }
    return '';
  }

  startRegister(): void {
    this.registering = true;
    this.clientError = '';
    this.duplicateClient = null;
    this.form = this.blankForm();
    this.firstAddress = this.blankAddress();
    // Lo tecleado en la busqueda suele ser el nombre o el telefono del que llama.
    const typed = this.query.trim();
    if (typed) {
      if (/^\d+$/.test(typed)) this.form.phone = typed.slice(0, PHONE_MAX_DIGITS);
      else this.form.name = typed;
    }
  }

  cancelRegister(): void {
    this.registering = false;
    this.clientError = '';
    this.duplicateClient = null;
  }

  /**
   * Da de alta al cliente y su primera direccion. Son dos llamadas porque la
   * direccion cuelga del cliente y necesita su id; si la segunda falla, el
   * cliente ya quedo guardado y solo hace falta agregarle el jiron.
   */
  registerClient(): void {
    const name = this.form.name.trim();
    const phone = this.form.phone.trim();
    const doc = this.form.docNumber.trim();
    const street = this.firstAddress.street.trim();

    if (!name) {
      this.clientError = 'El cliente necesita un nombre.';
      return;
    }
    const phoneProblem = this.phoneProblem(phone);
    if (phoneProblem) {
      this.clientError = phoneProblem;
      return;
    }
    const docProblem = this.docProblem(doc);
    if (docProblem) {
      this.clientError = docProblem;
      return;
    }
    const repeated = this.clientWithDoc(doc);
    if (repeated) {
      this.duplicateClient = repeated;
      this.clientError = `El DNI ${doc} ya esta registrado a nombre de ${repeated.name}.`;
      return;
    }
    if (!street) {
      this.clientError = 'Falta la direccion (jiron, calle o avenida) del reparto.';
      return;
    }
    if (this.firstAddress.deliveryFee < 0) {
      this.clientError = 'El costo de delivery no puede ser negativo.';
      return;
    }

    this.clientError = '';
    this.savingClient = true;

    const client: Client = {
      docType: doc ? 'DNI' : 'SIN_DOC',
      docNumber: doc || undefined,
      name,
      phone,
      active: true,
    };

    let created: Client | null = null;

    this.clientService
      .save(client)
      .pipe(
        switchMap((saved) => {
          created = saved;
          return this.clientService.addAddress(
            saved.idClient!,
            this.toAddress({ ...this.firstAddress, favorite: true })
          );
        })
      )
      .subscribe({
        next: (address) => {
          this.savingClient = false;
          this.registering = false;
          this.clients = [...this.clients, created!];
          this.selectedClient = created;
          this.addresses = [address];
          this.chooseAddress(address);
          this.form = this.blankForm();
          this.firstAddress = this.blankAddress();
          this.query = '';
        },
        error: (err) => {
          this.savingClient = false;
          if (created) {
            // El cliente entro pero su direccion no: se queda seleccionado con el
            // formulario cargado para que el cajero solo tenga que reintentar.
            this.clients = [...this.clients, created];
            this.selectedClient = created;
            this.addresses = [];
            this.registering = false;
            this.addressForm = { ...this.firstAddress, favorite: true };
            this.clientError =
              'Se registro el cliente pero no su direccion. Vuelve a guardarla abajo.';
            return;
          }
          this.clientError = this.messageOf(err, 'No se pudo registrar al cliente.');
        },
      });
  }

  selectClient(client: Client): void {
    this.selectedClient = client;
    this.selectedAddress = null;
    this.addresses = [];
    this.editingClient = null;
    this.addressForm = null;
    this.clientError = '';

    if (!client.idClient) return;
    this.clientService.getAddresses(client.idClient).subscribe({
      next: (list) => {
        this.addresses = list;
        const preferred = list.find((a) => a.favorite) ?? list[0];
        if (preferred) this.chooseAddress(preferred);
        // Un cliente sin direcciones no puede recibir nada: se pide el jiron.
        else this.addressForm = this.blankAddress();
      },
      error: () => {
        this.clientError = 'No se pudieron cargar las direcciones del cliente.';
      },
    });
  }

  clearClient(): void {
    this.selectedClient = null;
    this.selectedAddress = null;
    this.addresses = [];
    this.editingClient = null;
    this.addressForm = null;
    this.deliveryFee = 0;
  }

  // --- Edicion de los datos del cliente ---

  startEditClient(): void {
    if (!this.selectedClient) return;
    this.clientError = '';
    this.duplicateClient = null;
    this.editingClient = {
      name: this.selectedClient.name ?? '',
      phone: this.selectedClient.phone ?? '',
      docNumber: this.selectedClient.docNumber ?? '',
    };
  }

  cancelEditClient(): void {
    this.editingClient = null;
    this.clientError = '';
    this.duplicateClient = null;
  }

  saveClient(): void {
    if (!this.editingClient || !this.selectedClient?.idClient) return;

    const name = this.editingClient.name.trim();
    const phone = this.editingClient.phone.trim();
    const doc = this.editingClient.docNumber.trim();

    if (!name) {
      this.clientError = 'El cliente necesita un nombre.';
      return;
    }
    const phoneProblem = this.phoneProblem(phone);
    if (phoneProblem) {
      this.clientError = phoneProblem;
      return;
    }
    const docProblem = this.docProblem(doc);
    if (docProblem) {
      this.clientError = docProblem;
      return;
    }
    const repeated = this.clientWithDoc(doc, this.selectedClient.idClient);
    if (repeated) {
      this.duplicateClient = repeated;
      this.clientError = `El DNI ${doc} ya esta registrado a nombre de ${repeated.name}.`;
      return;
    }

    this.clientError = '';
    const updated: Client = {
      ...this.selectedClient,
      name,
      phone,
      docNumber: doc || undefined,
      docType: doc ? 'DNI' : 'SIN_DOC',
    };

    this.clientService.update(this.selectedClient.idClient, updated).subscribe({
      next: (saved) => {
        this.selectedClient = saved;
        this.clients = this.clients.map((c) => (c.idClient === saved.idClient ? saved : c));
        this.editingClient = null;
      },
      error: (err) => {
        this.clientError = this.messageOf(err, 'No se pudieron guardar los datos del cliente.');
      },
    });
  }

  // --- Direcciones ---

  chooseAddress(address: Address): void {
    this.selectedAddress = address;
    this.deliveryFee = Number(address.deliveryFee ?? 0);
  }

  startAddAddress(): void {
    this.clientError = '';
    // La primera direccion de un cliente queda como la habitual.
    this.addressForm = { ...this.blankAddress(), favorite: this.addresses.length === 0 };
  }

  startEditAddress(address: Address): void {
    this.clientError = '';
    this.addressForm = {
      idAddress: address.idAddress,
      street: address.street ?? '',
      district: address.district ?? '',
      reference: address.reference ?? '',
      deliveryFee: Number(address.deliveryFee ?? 0),
      favorite: !!address.favorite,
    };
  }

  cancelAddressForm(): void {
    this.addressForm = null;
    this.clientError = '';
  }

  get isEditingAddress(): boolean {
    return !!this.addressForm?.idAddress;
  }

  saveAddress(): void {
    if (!this.addressForm || !this.selectedClient?.idClient) return;

    const street = this.addressForm.street.trim();
    if (!street) {
      this.clientError = 'Falta la direccion (jiron, calle o avenida).';
      return;
    }
    if (this.addressForm.deliveryFee < 0) {
      this.clientError = 'El costo de delivery no puede ser negativo.';
      return;
    }

    this.clientError = '';
    this.savingAddress = true;

    const idAddress = this.addressForm.idAddress;
    const payload = this.toAddress(this.addressForm);

    const request$ = idAddress
      ? this.addressService.update(idAddress, payload)
      : this.clientService.addAddress(this.selectedClient.idClient, payload);

    request$.subscribe({
      next: (saved) => {
        this.savingAddress = false;
        this.addressForm = null;
        this.applySavedAddress(saved, idAddress);
      },
      error: (err) => {
        this.savingAddress = false;
        this.clientError = this.messageOf(err, 'No se pudo guardar la direccion.');
      },
    });
  }

  /** Marca una direccion como la habitual; el backend desmarca la anterior. */
  makeFavorite(address: Address): void {
    if (address.favorite || !address.idAddress) return;
    this.clientError = '';
    this.addressService
      .update(address.idAddress, { ...address, favorite: true })
      .subscribe({
        next: (saved) => this.applySavedAddress(saved, saved.idAddress),
        error: (err) =>
          (this.clientError = this.messageOf(err, 'No se pudo cambiar la direccion habitual.')),
      });
  }

  removeAddress(address: Address): void {
    if (!address.idAddress) return;
    if (!confirm(`Eliminar la direccion "${this.addressLabel(address)}"?`)) return;

    this.clientError = '';
    this.addressService.delete(address.idAddress).subscribe({
      next: () => {
        this.addresses = this.addresses.filter((a) => a.idAddress !== address.idAddress);
        if (this.selectedAddress?.idAddress === address.idAddress) {
          this.selectedAddress = null;
          this.deliveryFee = 0;
          const next = this.addresses.find((a) => a.favorite) ?? this.addresses[0];
          if (next) this.chooseAddress(next);
        }
      },
      // Una direccion ya usada en un pedido no se puede borrar sin romper su historial.
      error: () =>
        (this.clientError =
          'No se pudo eliminar la direccion. Si ya tiene pedidos entregados, no se puede borrar.'),
    });
  }

  /** Refresca la lista tras guardar, y vuelve a leer el resto por si cambio la habitual. */
  private applySavedAddress(saved: Address, idAddress?: number): void {
    if (idAddress) {
      this.addresses = this.addresses.map((a) => (a.idAddress === idAddress ? saved : a));
    } else {
      this.addresses = [...this.addresses, saved];
    }

    if (saved.favorite) {
      this.addresses = this.addresses.map((a) =>
        a.idAddress === saved.idAddress ? a : { ...a, favorite: false }
      );
    }

    if (!this.selectedAddress || this.selectedAddress.idAddress === saved.idAddress) {
      this.chooseAddress(saved);
    }
  }

  private toAddress(form: AddressForm): Address {
    return {
      street: form.street.trim(),
      district: form.district.trim() || undefined,
      reference: form.reference.trim() || undefined,
      deliveryFee: Number(form.deliveryFee) || 0,
      favorite: form.favorite,
    };
  }

  /** Direccion en una linea, como se lee en pantalla y en la boleta. */
  addressLabel(address: Address | null): string {
    if (!address) return '';
    const parts = [address.street];
    if (address.number) parts.push(address.number);
    const line = parts.join(' ');
    return address.district ? `${line}, ${address.district}` : line;
  }

  get canTakeOrder(): boolean {
    return !!this.selectedClient && !!this.selectedAddress;
  }

  goToOrder(): void {
    if (!this.canTakeOrder) return;
    this.errorMessage = '';
    this.successMessage = '';
    this.step = 'pedido';
  }

  backToClient(): void {
    this.step = 'cliente';
  }

  // ===================== Pedido =====================

  loadShiftStatus(): void {
    this.checkingShift = true;
    this.cashShiftService.getActiveShift().subscribe({
      next: (shift) => {
        this.activeShift = shift;
        this.checkingShift = false;
      },
      error: () => {
        this.activeShift = null;
        this.checkingShift = false;
      },
    });
  }

  selectCategory(category: Category): void {
    this.selectedCategory = category;
    if (!category.idCategory) return;
    this.productService.findByCategory(category.idCategory).subscribe((data) => {
      this.products = data;
    });
  }

  selectMethod(method: PaymentMethod): void {
    this.selectedMethodId = method.idPaymentMethod;
  }

  addToCart(product: Product): void {
    this.successMessage = '';
    if (product.requiresFlavor) {
      this.pendingFlavorProduct = product;
      return;
    }
    this.pushToCart(product);
  }

  onFlavorChosen(flavor: Flavor): void {
    if (this.pendingFlavorProduct) {
      this.pushToCart(this.pendingFlavorProduct, flavor);
    }
    this.pendingFlavorProduct = null;
  }

  onFlavorCancelled(): void {
    this.pendingFlavorProduct = null;
  }

  private pushToCart(product: Product, flavor?: Flavor): void {
    const line = this.cart.find(
      (l) => l.product.idProduct === product.idProduct && l.flavor?.idFlavor === flavor?.idFlavor
    );
    if (line) {
      line.quantity++;
      return;
    }
    this.cart.push({
      product,
      quantity: 1,
      flavor,
      unitPrice: product.price + (flavor?.priceDelta ?? 0),
    });
  }

  incrementLine(line: CartLine): void {
    line.quantity++;
  }

  decrementLine(line: CartLine): void {
    line.quantity--;
    if (line.quantity <= 0) {
      this.cart = this.cart.filter((l) => l !== line);
    }
  }

  get subtotal(): number {
    return this.cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  }

  get total(): number {
    return this.subtotal + (Number(this.deliveryFee) || 0);
  }

  /** Base imponible del total en pantalla; los precios de carta ya llevan IGV. */
  get taxableAmount(): number {
    return this.receiptService.breakdown(this.total).taxableAmount;
  }

  get igvAmount(): number {
    return this.receiptService.breakdown(this.total).igvAmount;
  }

  /** Sobre S/ 700 la boleta debe identificar al comprador con su DNI. */
  get needsDni(): boolean {
    return this.total > BOLETA_DNI_THRESHOLD && !this.selectedClient?.docNumber;
  }

  get canSend(): boolean {
    if (this.checkingShift || !this.activeShift || this.sending) return false;
    if (!this.selectedMethodId || !this.selectedClient || !this.selectedAddress) return false;
    if (this.needsDni) return false;
    // Con un cobro pendiente de reintento no hace falta carrito: falta el pago.
    return this.pendingPaymentOrder !== null || this.cart.length > 0;
  }

  get sendLabel(): string {
    if (this.sending) return 'Cobrando...';
    return this.pendingPaymentOrder ? 'Reintentar cobro' : 'Enviar y cobrar';
  }

  /**
   * El delivery sale de caja: el pedido y su cobro se registran en el mismo
   * gesto, igual que en venta rapida. Sin el cobro la venta no entraria en el
   * arqueo, porque la caja suma pagos y no pedidos.
   */
  sendOrder(): void {
    if (!this.activeShift) {
      this.errorMessage = 'Debes aperturar la caja antes de enviar pedidos.';
      return;
    }
    if (!this.selectedMethodId) {
      this.errorMessage = 'Elige el metodo de pago con el que cobras.';
      return;
    }
    if (!this.selectedClient || !this.selectedAddress) {
      this.errorMessage = 'Elige al cliente y la direccion del reparto.';
      return;
    }
    if ((Number(this.deliveryFee) || 0) < 0) {
      this.errorMessage = 'El costo de delivery no puede ser negativo.';
      return;
    }
    if (this.needsDni) {
      this.errorMessage =
        `Una boleta mayor a S/ ${BOLETA_DNI_THRESHOLD.toFixed(2)} debe identificar al comprador. ` +
        'Registra el DNI del cliente antes de cobrar.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (this.pendingPaymentOrder) {
      this.sending = true;
      this.collect(this.pendingPaymentOrder);
      return;
    }

    if (this.cart.length === 0) return;

    this.sending = true;
    this.sentLines = this.cart.map((l) => ({
      name: l.product.name,
      option: l.flavor?.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    }));

    const request: OrderCreateRequest = {
      saleType: 'DELIVERY',
      idClient: this.selectedClient.idClient,
      idAddress: this.selectedAddress.idAddress,
      deliveryFee: Number(this.deliveryFee) || 0,
      items: this.cart.map((l) => ({
        idProduct: l.product.idProduct!,
        quantity: l.quantity,
        idFlavor: l.flavor?.idFlavor,
        flavorName: l.flavor?.name,
      })),
    };

    this.orderService.createOrder(request).subscribe({
      next: (order) => this.collect(order),
      error: (err) => {
        this.errorMessage = this.messageOf(err, 'No se pudo enviar el pedido.');
        this.sending = false;
      },
    });
  }

  /** Registra el pago del total. Al cubrirlo, el backend deja el pedido PAGADO. */
  private collect(order: Order): void {
    if (!order.idOrder) {
      this.errorMessage = 'El pedido se creo sin identificador y no se pudo cobrar.';
      this.sending = false;
      return;
    }

    const amount = Number(order.total ?? this.total);

    this.paymentService
      .registerPayments({
        idOrder: order.idOrder,
        payments: [{ idPaymentMethod: this.selectedMethodId!, amount }],
      })
      .subscribe({
        next: () => {
          this.successMessage =
            `Pedido ${order.orderCode} cobrado. Total: S/ ${amount.toFixed(2)}`;
          this.cart = [];
          this.pendingPaymentOrder = null;
          // El cobro mueve los totales de la caja: se refresca el turno en pantalla.
          this.loadShiftStatus();
          this.emitInvoice(order, amount);
        },
        error: (err) => {
          this.pendingPaymentOrder = order;
          this.cart = [];
          this.errorMessage =
            `El pedido ${order.orderCode} se envio a la estacion pero no se pudo cobrar ` +
            `(${this.messageOf(err, 'error al registrar el pago')}). Reintenta el cobro.`;
          this.sending = false;
        },
      });
  }

  /**
   * Emite la boleta en el backend para que tome su serie y correlativo y quede
   * en el historial de comprobantes. Si la emision falla, la venta ya esta
   * cobrada: se arma igual una boleta con el IGV calculado aqui, marcada como
   * documento interno, para que el repartidor no salga sin nada.
   */
  private emitInvoice(order: Order, amount: number): void {
    this.invoiceService
      .emitInvoice({
        idOrder: order.idOrder!,
        invoiceType: 'BOLETA',
        idClient: this.selectedClient?.idClient,
        docType: this.selectedClient?.docType,
        docNumber: this.selectedClient?.docNumber,
        clientName: this.selectedClient?.name,
        clientAddress: this.addressLabel(this.selectedAddress),
      })
      .subscribe({
        next: (invoice) => {
          this.receipt = this.buildReceipt(order, amount, invoice);
          this.sending = false;
        },
        error: (err) => {
          this.receipt = this.buildReceipt(order, amount, null);
          this.errorMessage =
            `El cobro quedo registrado, pero no se pudo emitir el comprobante ` +
            `(${this.messageOf(err, 'error al emitir la boleta')}). ` +
            'Se imprime un documento interno con el detalle.';
          this.sending = false;
        },
      });
  }

  private buildReceipt(order: Order, amount: number, invoice: Invoice | null): DeliveryReceiptData {
    const fee = Number(order.deliveryFee ?? this.deliveryFee ?? 0);
    const method = this.paymentMethods.find(
      (m) => m.idPaymentMethod === this.selectedMethodId
    );
    const user = this.authService.currentUser();

    // El desglose del comprobante manda; si no se emitio, se calcula igual que
    // lo haria el backend para que los importes coincidan.
    const taxable = Number(invoice?.taxableAmount ?? this.receiptService.breakdown(amount).taxableAmount);
    const igv = Number(invoice?.igvAmount ?? this.receiptService.breakdown(amount).igvAmount);

    return {
      business: this.businessConfig,
      invoiceNumber: invoice?.fullNumber,
      orderCode: order.orderCode ?? '',
      issuedAt: invoice?.issueDate ? new Date(invoice.issueDate) : new Date(),
      clientName: this.selectedClient?.name ?? '',
      clientDocType: this.selectedClient?.docNumber ? this.selectedClient.docType : undefined,
      clientDoc: this.selectedClient?.docNumber,
      clientPhone: this.selectedClient?.phone,
      addressLine: this.addressLabel(this.selectedAddress),
      addressReference: this.selectedAddress?.reference,
      lines: this.sentLines,
      subtotal: Number(order.subtotal ?? this.subtotal),
      deliveryFee: fee,
      taxableAmount: taxable,
      igvAmount: igv,
      total: amount,
      paymentMethod: method?.name,
      cashier: user?.fullName || user?.username,
      qrData: invoice?.qrData,
    };
  }

  printReceipt(): void {
    if (!this.receipt) return;
    this.receiptService.print(this.receipt);
  }

  /** Deja la pantalla lista para la siguiente llamada. */
  newDelivery(): void {
    this.receipt = null;
    this.cart = [];
    this.sentLines = [];
    this.pendingPaymentOrder = null;
    this.successMessage = '';
    this.errorMessage = '';
    this.clearClient();
    this.duplicateClient = null;
    this.query = '';
    this.registering = !this.hasClients;
    this.step = 'cliente';
  }

  private messageOf(err: unknown, fallback: string): string {
    return (err as { message?: string })?.message || fallback;
  }

  private blankForm(): ClientForm {
    return { name: '', phone: '', docNumber: '' };
  }

  private blankAddress(): AddressForm {
    return { street: '', district: '', reference: '', deliveryFee: 0, favorite: false };
  }
}
