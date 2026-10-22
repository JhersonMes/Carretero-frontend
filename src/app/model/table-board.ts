import { TableStatus } from './enums';

/**
 * Resumen de una mesa tal como lo muestra la pantalla de Salon.
 *
 * Llega ya consolidado desde el backend (GET /tables/board) para no tener que
 * descargar los pedidos completos de todas las mesas en cada refresco.
 */
export interface TableBoard {
  idTable: number;
  name: string;
  capacity: number;
  status: TableStatus;
  orderIndex?: number;

  /** Pedido activo. Ausente cuando la mesa esta libre. */
  idOrder?: number;
  orderCode?: string;
  orderCreatedAt?: string;
  orderTotal?: number;

  /** Meseros que intervinieron en la mesa, sin repetir. */
  waiters: string[];

  totalItems: number;
  dispatchedItems: number;
  pendingItems: number;

  /** Envio de la comanda mas antigua del pedido. */
  firstSentAt?: string;
  /** Envio del item pendiente mas antiguo: origen del cronometro en marcha. */
  oldestPendingSentAt?: string;
  /** Ultimo despacho: congela el cronometro cuando ya no queda nada pendiente. */
  lastReadyAt?: string;

  allDispatched: boolean;
}
