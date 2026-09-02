/**
 * Saludos de bienvenida para la pantalla de Inicio.
 *
 * El turno del local va de 4:00 p. m. a 11:59 p. m., asi que solo existen dos
 * bloques: tarde y noche. No hay saludos de manana a proposito. Se elige uno al
 * azar en cada entrada para que la pantalla no se sienta siempre igual; todos
 * usan {name} como marcador del nombre de la persona conectada.
 */

export type GreetingSlot = 'tarde' | 'noche';

/** Hora en que el turno pasa de "tarde" a "noche". */
const NIGHT_STARTS_AT = 19;

/** Hasta esta hora de la madrugada seguimos considerando que es el turno noche. */
const NIGHT_ENDS_AT = 4;

const TARDE: string[] = [
  'Buenas tardes, {name}',
  'Buenas tardes, {name}. Arrancamos el turno',
  'Que tal, {name}. Listo para abrir el salon',
  'Hola {name}, bienvenido de vuelta',
  'Buenas tardes, {name}. La parrilla ya esta caliente',
  'Buenas tardes, {name}. Carbon encendido',
  'Aqui vamos, {name}. Tarde de buenas ventas',
  'Buenas tardes, {name}. Las mesas te esperan',
  'Hola {name}, a darle con toda',
  'Buenas tardes, {name}. Que sea un turno tranquilo',
  'Buenas tardes, {name}. Empieza el movimiento',
  'Que gusto verte, {name}. A trabajar',
  'Buenas tardes, {name}. Hoy se vende bonito',
  'Hola {name}, el salon ya esta listo',
  'Buenas tardes, {name}. Que no falte la sonrisa',
  'Animo, {name}. Recien empezamos',
  'Buenas tardes, {name}. A ordenar antes de la hora pico',
  'Hola {name}, un gusto tenerte en el turno',
  'Buenas tardes, {name}. Revisa tu caja y salimos',
  'Buenas tardes, {name}. Las brasas ya estan a punto',
  'Que tal, {name}. Buena tarde para ti',
  'Buenas tardes, {name}. Todo listo para atender',
];

const NOCHE: string[] = [
  'Buenas noches, {name}',
  'Buenas noches, {name}. Llego la hora fuerte',
  'Hola {name}, turno de noche encendido',
  'Buenas noches, {name}. El salon esta con ganas',
  'Animo, {name}. La noche es tuya',
  'Buenas noches, {name}. A mover esas comandas',
  'Hola {name}, la cocina esta al ritmo',
  'Buenas noches, {name}. Las brasas siguen vivas',
  'Buenas noches, {name}. Que fluya la atencion',
  'Aqui vamos, {name}. Noche de buenas ventas',
  'Buenas noches, {name}. Todo bajo control',
  'Hola {name}, gracias por estar aqui',
  'Buenas noches, {name}. Sigue esa buena racha',
  'Ultimo tramo, {name}. Vas muy bien',
  'Buenas noches, {name}. A rematar el dia',
  'Buenas noches, {name}. Paciencia y buena cara',
  'Hola {name}, la hora pico ya llego',
  'Buenas noches, {name}. Cierra tu caja sin apuro',
  'Animo, {name}. Ya casi cerramos',
  'Buenas noches, {name}. Que rinda el turno',
  'Buenas noches, {name}. Las mesas estan llenas',
  'Que tal la noche, {name}. Con toda',
];

const GREETINGS_BY_SLOT: Record<GreetingSlot, string[]> = {
  tarde: TARDE,
  noche: NOCHE,
};

/** Frases cortas que acompanan al saludo principal. */
const SUBTITLES: string[] = [
  'Aqui tienes el resumen de tu turno.',
  'Todo listo para atender.',
  'Un vistazo rapido antes de salir al salon.',
  'Asi va el movimiento de hoy.',
  'Gracias por tu trabajo en Carretero.',
  'Lo importante del turno, en una sola pantalla.',
  'Recuerda aperturar tu caja antes de vender.',
  'Que rinda la noche.',
];

/**
 * Bloque horario del turno. Las horas de madrugada siguen contando como noche:
 * el cierre puede pasar de las 12 y no corresponde saludar con "buenas tardes".
 */
export function greetingSlotFor(hour: number): GreetingSlot {
  return hour >= NIGHT_STARTS_AT || hour < NIGHT_ENDS_AT ? 'noche' : 'tarde';
}

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

/** Saludo aleatorio del bloque horario de `date`, ya con el nombre reemplazado. */
export function randomGreeting(name: string, date: Date = new Date()): string {
  const slot = greetingSlotFor(date.getHours());
  const display = (name || '').trim() || 'companero';
  return pick(GREETINGS_BY_SLOT[slot]).replace('{name}', display);
}

export function randomSubtitle(): string {
  return pick(SUBTITLES);
}
