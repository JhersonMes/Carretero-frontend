import { CheckoutModalComponent } from './checkout-modal.component';
import { Order } from '../../../../model/order';
import { OrderDetail } from '../../../../model/order-detail';

/**
 * Pruebas unitarias para CheckoutModalComponent.
 * Guiadas de Semana07_CalProSoft y documentadas en ANEXOS:
 * CP-COB-02: Bloqueo de cobro que supera el saldo pendiente.
 * CP-COB-07: Dividir la cuenta y sugerir el subtotal de la línea seleccionada.
 * CP-CPE-04: Bloqueo de emisión de factura con RUC incompleto antes de cobrar.
 */
describe('CheckoutModalComponent', () => {
  let component: CheckoutModalComponent;

  beforeEach(() => {
    component = Object.create(CheckoutModalComponent.prototype);
    component.selectedDetailIds = new Set<number>();
    component.paymentLines = [{ idPaymentMethod: null, amount: 0 }];
    component.splitMode = false;
    component.alreadyPaid = 0;
    component.invoiceType = 'BOLETA';
    component.docNumber = '';
    component.errorMessage = '';
    component.successMessage = '';
  });

  // CASO DE PRUEBA CP-COB-02: El modal de cobro bloquea el exceso antes de llamar al servidor
  it('submit_montoMayorAlSaldo_muestraErrorYNoLlamaAlServicio', () => {
    // preparacion
    component.order = {
      idOrder: 1,
      orderCode: 'PED-20261001-0001',
      total: 74.00,
      subtotal: 74.00,
      status: 'PENDIENTE',
      saleType: 'SALON',
    } as Order;
    component.alreadyPaid = 0;
    component.paymentLines = [
      { idPaymentMethod: 1, amount: 80.00 } // 80.00 > 74.00
    ];

    let registerPaymentsCalled = false;
    (component as any).paymentService = {
      registerPayments: () => {
        registerPaymentsCalled = true;
      }
    };

    // ejecucion
    component.submit();

    // afirmacion
    expect(component.errorMessage).toBe('El monto ingresado (S/ 80.00) supera el saldo pendiente (S/ 74.00).');
    expect(registerPaymentsCalled).toBe(false);
  });

  // CASO DE PRUEBA CP-COB-07: Dividir la cuenta: el cliente paga solo las alitas de pollo (S/ 49.00)
  it('toggleSplitMode_seleccionaUnaLinea_sugiereSuSubtotal', () => {
    // preparacion
    const d1: OrderDetail = {
      idOrderDetail: 101,
      productName: 'Alitas De Pollo X 6',
      quantity: 2,
      unitPrice: 24.50,
      subtotal: 49.00,
      itemStatus: 'EN_PREPARACION',
    };
    const d2: OrderDetail = {
      idOrderDetail: 102,
      productName: 'Alitas De Cerdo X 4 Unds',
      quantity: 1,
      unitPrice: 18.00,
      subtotal: 18.00,
      itemStatus: 'EN_PREPARACION',
    };
    const d3: OrderDetail = {
      idOrderDetail: 103,
      productName: 'Gaseosas',
      quantity: 2,
      unitPrice: 3.50,
      subtotal: 7.00,
      itemStatus: 'EN_PREPARACION',
    };

    component.order = {
      idOrder: 1,
      total: 74.00,
      subtotal: 74.00,
      status: 'PENDIENTE',
      saleType: 'SALON',
      details: [d1, d2, d3],
    } as Order;
    component.alreadyPaid = 0;
    component.paymentLines = [{ idPaymentMethod: 1, amount: 74.00 }];

    // ejecucion
    // Paso 1: Activar modo dividir cuenta
    component.splitMode = true;
    component.selectedDetailIds.clear();

    // Paso 2: Seleccionar solo la línea de Alitas de Pollo (id 101)
    component.selectedDetailIds.add(101);
    component.useSuggestedAmount();

    // afirmacion
    expect(component.selectedSubtotal).toBe(49.00);
    expect(component.targetAmount).toBe(49.00);
    expect(component.paymentLines[0].amount).toBe(49.00);
  });

  // CASO DE PRUEBA CP-CPE-04: Modal de cobro: Factura con RUC incompleto se bloquea ANTES de registrar el pago
  it('submit_facturaConRucDe10Digitos_noRegistraPago', () => {
    // preparacion
    component.order = {
      idOrder: 1,
      total: 74.00,
      subtotal: 74.00,
      status: 'PENDIENTE',
      saleType: 'SALON',
    } as Order;
    component.alreadyPaid = 0;
    component.invoiceType = 'FACTURA';
    component.docNumber = '2060123456'; // 10 dígitos (incompleto)
    component.paymentLines = [{ idPaymentMethod: 1, amount: 74.00 }];

    let registerPaymentsCalled = false;
    (component as any).paymentService = {
      registerPayments: () => {
        registerPaymentsCalled = true;
      }
    };

    // ejecucion
    component.submit();

    // afirmacion
    expect(component.errorMessage).toBe('Para Factura, el RUC debe tener 11 digitos.');
    expect(registerPaymentsCalled).toBe(false);
  });
});
