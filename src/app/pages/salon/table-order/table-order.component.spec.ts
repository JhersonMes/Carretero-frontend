import { TableOrderComponent } from './table-order.component';
import { Product } from '../../../model/product';
import { Flavor } from '../../../model/flavor';

/**
 * Pruebas unitarias para TableOrderComponent.
 * Guiadas de Semana07_CalProSoft y documentadas en ANEXOS:
 * CP-PED-04: Mismo producto con dos sabores distintos genera dos líneas independientes.
 */
describe('TableOrderComponent', () => {
  let component: TableOrderComponent;

  beforeEach(() => {
    component = Object.create(TableOrderComponent.prototype);
    component.draftCart = [];
  });

  // CASO DE PRUEBA CP-PED-04: Mismo producto con dos sabores distintos genera dos líneas independientes
  it('pushToCart_mismoProductoDistintoSabor_creaDosLineas', () => {
    // preparacion
    const alitas: Product = {
      idProduct: 1,
      name: 'Alitas De Pollo X 6',
      price: 24.50,
      category: { idCategory: 1, name: 'ALITAS DE POLLO', station: 'COCINA' },
      active: true,
      requiresFlavor: true,
      requiresStation: false,
    };

    const saborBbq: Flavor = {
      idFlavor: 10,
      name: 'BBQ',
      priceDelta: 0.00,
      active: true,
    };

    const saborMaracuya: Flavor = {
      idFlavor: 11,
      name: 'Maracuyá',
      priceDelta: 0.00,
      active: true,
    };

    // ejecucion
    // Paso 1: Agregar Alitas con BBQ
    (component as any).pushToCart(alitas, saborBbq);

    // Paso 2: Agregar Alitas con Maracuyá
    (component as any).pushToCart(alitas, saborMaracuya);

    // Paso 3: Agregar otra vez Alitas con BBQ
    (component as any).pushToCart(alitas, saborBbq);

    // afirmacion
    // El carrito debe tener exactamente 2 líneas independientes
    expect(component.draftCart.length).toBe(2);

    const lineaBbq = component.draftCart.find(l => l.flavor?.name === 'BBQ');
    const lineaMaracuya = component.draftCart.find(l => l.flavor?.name === 'Maracuyá');

    expect(lineaBbq).toBeDefined();
    expect(lineaBbq?.quantity).toBe(2);
    expect(lineaBbq?.unitPrice).toBe(24.50);

    expect(lineaMaracuya).toBeDefined();
    expect(lineaMaracuya?.quantity).toBe(1);
    expect(lineaMaracuya?.unitPrice).toBe(24.50);

    // Total del carrito = (2 * 24.50) + (1 * 24.50) = 73.50
    expect(component.draftTotal).toBe(73.50);
  });
});
