import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Preferencias de visualizacion del widget de accesibilidad propio.
 * Solo incluye lo que respalda la evaluacion del publico (informe, literal h):
 * - Tamano de letra: astigmatismo, miopia, presbicia y baja vision.
 * - Alto contraste: baja vision y pantallas con reflejo o vapor (cocina).
 * - Lectura comoda: dislexia (espaciado de WCAG 1.4.12).
 * - Senales sin color: daltonismo (urgencia y opcion elegida tambien en texto).
 */
export type TextSize = 100 | 115 | 130 | 150;

export interface A11yPrefs {
  textSize: TextSize;
  highContrast: boolean;
  readingMode: boolean;
  colorCues: boolean;
}

export const TEXT_SIZES: readonly TextSize[] = [100, 115, 130, 150];

export const DEFAULT_PREFS: A11yPrefs = {
  textSize: 100,
  highContrast: false,
  readingMode: false,
  colorCues: false,
};

/** Dueno de las preferencias cuando nadie ha iniciado sesion (pantalla de login). */
export const DEVICE_OWNER = 'equipo';

const KEY_PREFIX = 'carretero.a11y.';

export function storageKey(owner: string): string {
  return KEY_PREFIX + owner.trim().toLowerCase();
}

/** Lee lo guardado y descarta valores invalidos (datos viejos o editados a mano). */
export function parsePrefs(raw: string | null): A11yPrefs {
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const data = JSON.parse(raw) as Partial<A11yPrefs>;
    return {
      textSize: TEXT_SIZES.includes(data.textSize as TextSize) ? (data.textSize as TextSize) : DEFAULT_PREFS.textSize,
      highContrast: data.highContrast === true,
      readingMode: data.readingMode === true,
      colorCues: data.colorCues === true,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** Clases que se ponen en <html>; los estilos estan en styles.css. */
export function prefsToClasses(prefs: A11yPrefs): Record<string, boolean> {
  return {
    'a11y-contrast': prefs.highContrast,
    'a11y-reading': prefs.readingMode,
    'a11y-cues': prefs.colorCues,
  };
}

export function isDefault(prefs: A11yPrefs): boolean {
  return (
    prefs.textSize === DEFAULT_PREFS.textSize &&
    prefs.highContrast === DEFAULT_PREFS.highContrast &&
    prefs.readingMode === DEFAULT_PREFS.readingMode &&
    prefs.colorCues === DEFAULT_PREFS.colorCues
  );
}

/**
 * Guarda las preferencias por operario: en una caja o pantalla de cocina compartida,
 * cada trabajador ve el sistema a su medida al iniciar sesion, sin cambiar la de sus companeros.
 */
@Injectable({ providedIn: 'root' })
export class AccessibilityService {
  private readonly doc = inject(DOCUMENT);
  private readonly auth = inject(AuthService);

  readonly owner = computed(() => this.auth.currentUser()?.username ?? DEVICE_OWNER);

  private readonly _prefs = signal<A11yPrefs>({ ...DEFAULT_PREFS });
  readonly prefs = this._prefs.asReadonly();
  readonly hasChanges = computed(() => !isDefault(this._prefs()));

  constructor() {
    // Al cambiar de usuario (login / logout) se cargan sus preferencias.
    effect(() => this._prefs.set(parsePrefs(this.read(storageKey(this.owner())))));
    effect(() => this.apply(this._prefs()));
  }

  update(patch: Partial<A11yPrefs>): void {
    const next = { ...this._prefs(), ...patch };
    this._prefs.set(next);
    this.write(storageKey(this.owner()), next);
  }

  reset(): void {
    this.update({ ...DEFAULT_PREFS });
  }

  private apply(prefs: A11yPrefs): void {
    const root = this.doc.documentElement;
    // Los tamanos de la app estan en rem, asi que basta con cambiar la base de <html>.
    root.style.fontSize = prefs.textSize === 100 ? '' : `${prefs.textSize}%`;
    for (const [cls, on] of Object.entries(prefsToClasses(prefs))) {
      root.classList.toggle(cls, on);
    }
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, prefs: A11yPrefs): void {
    try {
      if (isDefault(prefs)) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(prefs));
    } catch {
      // Sin almacenamiento (modo privado): el ajuste dura hasta recargar la pagina.
    }
  }
}
