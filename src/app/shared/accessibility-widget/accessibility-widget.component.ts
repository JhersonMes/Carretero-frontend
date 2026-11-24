import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { AccessibilityService, A11yPrefs, TextSize } from '../../services/accessibility.service';

interface SizeOption {
  value: TextSize;
  label: string;
  sample: string;
}

type ToggleKey = 'highContrast' | 'readingMode' | 'colorCues';

interface ToggleOption {
  key: ToggleKey;
  label: string;
  hint: string;
}

/**
 * Widget de accesibilidad propio (reemplaza a UserWay).
 * Funciona sin internet, guarda la configuracion por operario y solo ofrece
 * los ajustes que respalda la evaluacion del publico del sistema.
 */
@Component({
  selector: 'app-accessibility-widget',
  standalone: true,
  templateUrl: './accessibility-widget.component.html',
  styleUrl: './accessibility-widget.component.css',
})
export class AccessibilityWidgetComponent {
  readonly a11y = inject(AccessibilityService);
  private readonly host = inject(ElementRef<HTMLElement>);

  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('toggleButton');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly open = signal(false);

  readonly sizes: SizeOption[] = [
    { value: 100, label: 'Normal', sample: 'A' },
    { value: 115, label: 'Grande', sample: 'A' },
    { value: 130, label: 'Muy grande', sample: 'A' },
    { value: 150, label: 'Máxima', sample: 'A' },
  ];

  readonly toggles: ToggleOption[] = [
    { key: 'highContrast', label: 'Alto contraste', hint: 'Textos y bordes más oscuros.' },
    { key: 'readingMode', label: 'Lectura cómoda', hint: 'Más espacio entre letras, palabras y líneas.' },
    { key: 'colorCues', label: 'Señales sin color', hint: 'Muestra en texto la urgencia de las comandas y la opción elegida.' },
  ];

  toggleOpen(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    // Al abrir, el foco pasa al panel para poder usarlo con teclado.
    setTimeout(() => this.panel()?.nativeElement.querySelector<HTMLElement>('button')?.focus());
  }

  close(returnFocus = true): void {
    if (!this.open()) return;
    this.open.set(false);
    if (returnFocus) this.toggleButton()?.nativeElement.focus();
  }

  setSize(size: TextSize): void {
    this.a11y.update({ textSize: size });
  }

  flip(key: ToggleKey): void {
    const prefs: A11yPrefs = this.a11y.prefs();
    this.a11y.update({ [key]: !prefs[key] });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }
}
