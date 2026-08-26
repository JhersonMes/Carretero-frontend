import { Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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

  /**
   * El anillo (Circulos) solo compone bien junto al wordmark, que ocupa la mitad
   * inferior del lienzo original. Sin texto, se recorta ajustado a la llama para
   * evitar el hueco vacio que deja el anillo completo en un icono pequeno.
   */
  get viewBox(): string {
    if (this.textOnly) return '0 245.7 777.8 124.7';
    return this.showWordmark ? '0 0 777.76 608.85' : '264 33 250 250';
  }
}
