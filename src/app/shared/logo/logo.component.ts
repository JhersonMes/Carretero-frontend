import { Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Centro geometrico del anillo en el lienzo original (777.76 x 608.85). */
const RING_CENTER_X = 388.88;
const RING_CENTER_Y = 304.43;

/** Centro del bounding box de la fogata en ese mismo lienzo. */
const FLAME_CENTER_X = 388.64;
const FLAME_CENTER_Y = 157.87;

/** Ampliacion de la fogata para que llene el anillo sin tocar los arcos. */
const EMBLEM_FLAME_SCALE = 1.9;

/**
 * Isotipo animado de Carretero (fogata + doble arco + wordmark), extraido del
 * sitio institucional. Reutilizable en login, layout y dashboard.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.css',
})
export class LogoComponent {
  /** Ancho del logo en pixeles; el alto se ajusta segun el viewBox original. */
  @Input() size = 220;

  /** Cuando es false, el fuego y el trazo quedan estaticos (uso en cabeceras compactas). */
  @Input() animated = true;

  /** Cuando es false, oculta el wordmark "CARRETERO" y la leyenda (solo el emblema). */
  @Input() showWordmark = true;

  /**
   * Dibuja los dos arcos que rodean al isotipo cuando el wordmark esta oculto.
   * Es el emblema compacto que usa la cabecera: mismo anillo del logo completo,
   * pero con la fogata centrada dentro del circulo en vez de en su mitad superior.
   */
  @Input() showRing = false;

  /** Cuando es true, muestra unicamente las letras vectorizadas "CARRETERO" (sin llama ni anillo). */
  @Input() textOnly = false;

  /** 'light' = trazos blancos (para fondos rojos/oscuros), 'dark' = trazos rojos (para fondos claros). */
  @Input() variant: 'light' | 'dark' = 'light';

  @HostBinding('style.width.px') get hostWidth() {
    return this.size;
  }

  @HostBinding('class.is-static') get isStatic() {
    return !this.animated;
  }

  @HostBinding('class.is-dark') get isDarkVariant() {
    return this.variant === 'dark';
  }

  /** Muestra el anillo: junto al wordmark (logo completo) o como emblema compacto. */
  get showsRing(): boolean {
    return !this.textOnly && (this.showWordmark || this.showRing);
  }

  /**
   * En el emblema compacto la fogata se reubica al centro del anillo. En el
   * lienzo original vive en la mitad superior porque debajo va el wordmark; sin
   * texto quedaria descentrada y con un hueco vacio en la mitad inferior.
   */
  get flameTransform(): string | null {
    if (this.showWordmark || this.textOnly || !this.showRing) return null;
    return `translate(${RING_CENTER_X} ${RING_CENTER_Y}) scale(${EMBLEM_FLAME_SCALE}) translate(${-FLAME_CENTER_X} ${-FLAME_CENTER_Y})`;
  }

  /**
   * El anillo (Circulos) solo compone bien junto al wordmark, que ocupa la mitad
   * inferior del lienzo original. Sin texto ni anillo se recorta ajustado a la
   * llama para evitar el hueco vacio que deja el anillo completo en un icono
   * pequeno; con showRing se encuadra el circulo completo.
   */
  get viewBox(): string {
    if (this.textOnly) return '0 245.7 777.8 124.7';
    if (this.showWordmark) return '0 0 777.76 608.85';
    return this.showRing ? '84.45 0 608.85 608.85' : '264 33 250 250';
  }
}
