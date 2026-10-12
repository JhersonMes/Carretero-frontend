import { SalonComponent } from './salon.component';
import { TableBoard } from '../../model/table-board';

/**
 * Pruebas unitarias para SalonComponent.
 * Guiadas de Semana07_CalProSoft y documentadas en ANEXOS:
 * CP-COM-05: Valores límite del cronómetro de la mesa (5, 6, 11, 12 y 13 minutos).
 */
describe('SalonComponent', () => {
  let component: SalonComponent;

  beforeEach(() => {
    // Instanciacion aislada del prototipo para pruebas unitarias de logica pura
    component = Object.create(SalonComponent.prototype);
  });

  // CASO DE PRUEBA CP-COM-05: Valores límite del cronómetro de la mesa: 5, 6, 11 y 12 minutos
  it('urgency_valoresLimite_normalWarnLate: calcula fresh, warn y late segun los minutos transcurridos', () => {
    // preparacion
    const baseNow = Date.now();
    (component as any).now = baseNow;

    const buildTableWithWait = (minutesAgo: number): TableBoard => ({
      idTable: 3,
      name: 'Mesa 3',
      capacity: 4,
      status: 'OCUPADA',
      orderIndex: 3,
      totalItems: 3,
      pendingItems: 1,
      dispatchedItems: 2,
      allDispatched: false,
      waiters: ['mesero1'],
      oldestPendingSentAt: new Date(baseNow - minutesAgo * 60_000).toISOString(),
    });

    // ejecucion
    const urgency5min = component.urgency(buildTableWithWait(5));
    const urgency6min = component.urgency(buildTableWithWait(6));
    const urgency11min = component.urgency(buildTableWithWait(11));
    const urgency12min = component.urgency(buildTableWithWait(12));
    const urgency13min = component.urgency(buildTableWithWait(13));

    // afirmacion
    // 5 min (< 6 min) -> fresh (verde)
    expect(urgency5min).toBe('fresh');

    // 6 min (inicio de warn) -> warn (naranja)
    expect(urgency6min).toBe('warn');

    // 11 min y 12 min (tope de warn) -> warn (naranja)
    expect(urgency11min).toBe('warn');
    expect(urgency12min).toBe('warn');

    // 13 min (> 12 min) -> late (rojo)
    expect(urgency13min).toBe('late');
  });
});
