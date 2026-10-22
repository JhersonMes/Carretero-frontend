import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { CashShift } from '../model/cash-shift';
import { KitchenStation } from '../model/enums';
import { Order } from '../model/order';
import { Product } from '../model/product';
import { CashShiftService } from './cash-shift.service';
import { OrderService } from './order.service';
import { ProductService } from './product.service';

/** Un producto dentro del ranking del turno. */
export interface RankedProduct {
  name: string;
  quantity: number;
  amount: number;
}

/** Que se esta rankeando. La pantalla arma el titulo a partir de esto. */
export type RankedGroupKey = 'PLATOS' | 'BEBIDAS' | 'AREA';

export interface RankedGroup {
  key: RankedGroupKey;
  items: RankedProduct[];
}

/** Resumen de lo vendido entre la apertura y el cierre de un turno de caja. */
export interface ShiftStats {
  /** Turno abierto; si no hay ninguno, el ultimo turno cerrado. Null si nunca se aperturo caja. */
  shift: CashShift | null;
  /** True cuando el turno sigue abierto (el ranking se sigue moviendo). */
  isOpen: boolean;
  /** Uno o dos rankings segun quien mire: el salon ve platos y bebidas, un area ve lo suyo. */
  rankings: RankedGroup[];
  /** Cuantos productos entran en cada ranking. */
  rankingSize: number;
  /** Pedidos no anulados registrados dentro de la ventana del turno. */
  orderCount: number;
  itemCount: number;
  salesTotal: number;
}

/** Cuantos puestos muestra el salon (platos y bebidas por separado). */
const SALON_RANKING_SIZE = 3;

/** Cuantos puestos muestra una estacion, que tiene un solo ranking. */
const STATION_RANKING_SIZE = 10;

const DRINK_STATIONS: KitchenStation[] = ['BEBIDAS', 'BARRA'];

/**
 * Que estaciones alimentan el ranking de cada area.
 *
 * Bebidas suma tambien la barra: son la misma area de despacho y el catalogo usa
 * las dos etiquetas indistintamente.
 */
const STATIONS_BY_AREA: Record<string, KitchenStation[]> = {
  COCINA: ['COCINA'],
  PARRILLA: ['PARRILLA'],
  BEBIDAS: ['BEBIDAS', 'BARRA'],
};

const EMPTY_STATS: ShiftStats = {
  shift: null,
  isOpen: false,
  rankings: [],
  rankingSize: SALON_RANKING_SIZE,
  orderCount: 0,
  itemCount: 0,
  salesTotal: 0,
};

/**
 * Ranking de lo mas vendido durante un turno de caja.
 *
 * El backend no expone un endpoint de estadisticas, asi que el calculo se hace
 * aqui cruzando los pedidos con el catalogo: el pedido guarda el nombre del
 * producto pero no su estacion, y esa estacion es la que decide si una linea
 * cuenta como plato o como bebida.
 */
@Injectable({ providedIn: 'root' })
export class ShiftStatsService {
  private cashShiftService = inject(CashShiftService);
  private orderService = inject(OrderService);
  private productService = inject(ProductService);

  /**
   * Resumen del turno vigente. Si la caja ya se cerro, devuelve el del ultimo
   * turno cerrado para que el usuario vea con que numeros termino su jornada.
   *
   * @param area rol de estacion (COCINA, PARRILLA, BEBIDAS). Con un area, todo el
   *        resumen se limita a lo que esa estacion preparo: no tiene sentido que
   *        cocina vea el ranking de bebidas. Sin area se usa la vista de salon,
   *        que separa platos de bebidas.
   */
  loadCurrentShiftStats(area?: string | null): Observable<ShiftStats> {
    const stations = this.stationsOf(area);
    const empty = { ...EMPTY_STATS, rankingSize: this.rankingSizeFor(stations) };

    return this.resolveShift().pipe(
      switchMap((shift) => {
        if (!shift?.openTime) return of({ ...empty, shift });
        return this.buildStats(shift, stations);
      }),
      catchError(() => of(empty))
    );
  }

  /** Estaciones del area, o null cuando el rol no es de estacion (salon/admin). */
  private stationsOf(area?: string | null): KitchenStation[] | null {
    if (!area) return null;
    return STATIONS_BY_AREA[area.toUpperCase()] ?? null;
  }

  private rankingSizeFor(stations: KitchenStation[] | null): number {
    return stations ? STATION_RANKING_SIZE : SALON_RANKING_SIZE;
  }

  /** Turno abierto o, en su defecto, el ultimo cerrado. */
  private resolveShift(): Observable<CashShift | null> {
    return this.cashShiftService.getActiveShift().pipe(
      catchError(() => of(null as unknown as CashShift)),
      switchMap((active) => (active ? of(active) : this.lastClosedShift()))
    );
  }

  private lastClosedShift(): Observable<CashShift | null> {
    return this.cashShiftService.findAll().pipe(
      map((shifts) => {
        const closed = shifts.filter((s) => s.status === 'CERRADA' && s.openTime);
        if (!closed.length) return null;
        return closed.reduce((latest, current) =>
          this.shiftEndOf(current) > this.shiftEndOf(latest) ? current : latest
        );
      }),
      catchError(() => of(null))
    );
  }

  private shiftEndOf(shift: CashShift): number {
    return new Date(shift.closeTime ?? shift.openTime ?? 0).getTime();
  }

  private buildStats(shift: CashShift, stations: KitchenStation[] | null): Observable<ShiftStats> {
    return forkJoin({
      orders: this.orderService.findAllRaw().pipe(catchError(() => of([] as Order[]))),
      products: this.productService.findAllRaw().pipe(catchError(() => of([] as Product[]))),
    }).pipe(map(({ orders, products }) => this.summarize(shift, orders, products, stations)));
  }

  private summarize(
    shift: CashShift,
    orders: Order[],
    products: Product[],
    stations: KitchenStation[] | null
  ): ShiftStats {
    const from = new Date(shift.openTime!).getTime();
    const to = shift.closeTime ? new Date(shift.closeTime).getTime() : Date.now();
    const stationByProduct = this.buildStationIndex(products);
    const size = this.rankingSizeFor(stations);

    const dishes = new Map<string, RankedProduct>();
    const drinks = new Map<string, RankedProduct>();
    const area = new Map<string, RankedProduct>();
    let orderCount = 0;
    let itemCount = 0;
    let salesTotal = 0;

    for (const order of orders) {
      if (order.status === 'CANCELADO' || !order.createdAt) continue;
      const created = new Date(order.createdAt).getTime();
      if (created < from || created > to) continue;

      // Con un area, el pedido solo cuenta si trajo trabajo para esa estacion, y
      // los totales suman unicamente sus lineas: es su produccion, no la del local.
      let countedForArea = false;

      for (const detail of order.details ?? []) {
        const quantity = Number(detail.quantity ?? 0);
        if (quantity <= 0) continue;

        const station = this.stationOf(detail.idProduct, detail.productName, stationByProduct);
        const amount = Number(detail.subtotal ?? 0);

        if (stations) {
          if (!stations.includes(station)) continue;
          countedForArea = true;
          itemCount += quantity;
          salesTotal += amount;
          this.accumulate(area, detail.productName, quantity, amount);
          continue;
        }

        itemCount += quantity;
        const bucket = DRINK_STATIONS.includes(station) ? drinks : dishes;
        this.accumulate(bucket, detail.productName, quantity, amount);
      }

      if (stations) {
        if (countedForArea) orderCount++;
      } else {
        orderCount++;
        salesTotal += Number(order.total ?? 0);
      }
    }

    return {
      shift,
      isOpen: shift.status === 'ABIERTA',
      rankings: stations
        ? [{ key: 'AREA', items: this.rank(area, size) }]
        : [
            { key: 'PLATOS', items: this.rank(dishes, size) },
            { key: 'BEBIDAS', items: this.rank(drinks, size) },
          ],
      rankingSize: size,
      orderCount,
      itemCount,
      salesTotal,
    };
  }

  /**
   * Indexa la estacion por id y tambien por nombre normalizado: los pedidos
   * antiguos pueden apuntar a un producto que ya se elimino del catalogo, pero
   * conservan el nombre con el que se vendio.
   */
  private buildStationIndex(products: Product[]): Map<string, KitchenStation> {
    const index = new Map<string, KitchenStation>();
    for (const product of products) {
      const station = product.station ?? product.category?.station;
      if (!station) continue;
      if (product.idProduct != null) index.set(`id:${product.idProduct}`, station);
      index.set(`name:${this.normalize(product.name)}`, station);
    }
    return index;
  }

  private stationOf(
    idProduct: number | undefined,
    productName: string,
    index: Map<string, KitchenStation>
  ): KitchenStation {
    if (idProduct != null) {
      const byId = index.get(`id:${idProduct}`);
      if (byId) return byId;
    }
    return index.get(`name:${this.normalize(productName)}`) ?? 'OTRO';
  }

  private normalize(value: string | undefined): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private accumulate(
    bucket: Map<string, RankedProduct>,
    name: string,
    quantity: number,
    amount: number
  ): void {
    const key = this.normalize(name);
    const current = bucket.get(key);
    if (current) {
      current.quantity += quantity;
      current.amount += amount;
      return;
    }
    bucket.set(key, { name, quantity, amount });
  }

  private rank(bucket: Map<string, RankedProduct>, size: number): RankedProduct[] {
    return [...bucket.values()]
      .sort((a, b) => b.quantity - a.quantity || b.amount - a.amount)
      .slice(0, size);
  }
}
