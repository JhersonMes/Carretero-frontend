import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessConfigService } from '../../../services/business-config.service';

/** Largo del PIN, el mismo que valida el backend al guardarlo. */
const PIN_LENGTH = 4;

/**
 * Teclado del PIN que autoriza anular o corregir una venta.
 *
 * Se pide antes de abrir la accion, no al confirmarla: llenar un formulario
 * entero para enterarse recien al final de que no hay autorizacion es tiempo
 * perdido delante del cliente.
 *
 * Comprobar aqui es solo la puerta de la pantalla. La operacion real vuelve a
 * validar el PIN en el servidor, que es donde de verdad se decide; por eso el
 * componente emite el PIN validado en vez de un simple "adelante".
 */
@Component({
  selector: 'app-pin-pad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pin-pad.component.html',
  styleUrl: './pin-pad.component.css',
})
export class PinPadComponent {
  private businessConfigService = inject(BusinessConfigService);

  /** Que se va a autorizar, para que se lea antes de teclear. */
  @Input() subtitle = '';

  /** Emite el PIN ya validado; quien lo recibe lo manda con la operacion. */
  @Output() authorized = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  readonly keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  readonly pinLength = PIN_LENGTH;

  digits = '';
  error = '';
  verifying = false;

  /**
   * Casilleros del PIN: son tantos como digitos tiene, y se van llenando. Asi
   * se ve de un vistazo cuanto falta y que el codigo esta completo.
   */
  get dots(): boolean[] {
    return Array.from({ length: PIN_LENGTH }, (_, i) => i < this.digits.length);
  }

  get complete(): boolean {
    return this.digits.length === PIN_LENGTH;
  }

  /** Al llegar al largo del PIN deja de aceptar: seguir tecleando no aporta nada. */
  press(key: string): void {
    if (this.complete) return;
    this.digits += key;
    this.error = '';
  }

  /**
   * El teclado fisico maneja el pad igual que los botones.
   *
   * En caja se teclea con las dos manos y mirando al cliente: obligar a apuntar
   * con el mouse a nueve botones es mas lento que escribir el PIN de corrido.
   *
   * Se mira tambien `code` porque, con Bloq Num apagado, las teclas del teclado
   * numerico no llegan como digitos sino como Fin, Inicio o flechas.
   */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const numpad = /^Numpad([0-9])$/.exec(event.code);
    const digit = numpad ? numpad[1] : /^[0-9]$/.test(event.key) ? event.key : null;

    if (digit) {
      this.press(digit);
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      this.erase();
    } else if (event.key === 'Enter') {
      this.submit();
    } else if (event.key === 'Escape') {
      this.cancel();
    } else {
      return;
    }

    // El pad es una ventana modal: mientras esta abierta, estas teclas son suyas
    // y no deben llegar a la pantalla de atras.
    event.preventDefault();
  }

  erase(): void {
    this.digits = this.digits.slice(0, -1);
    this.error = '';
  }

  cancel(): void {
    this.digits = '';
    this.error = '';
    this.cancelled.emit();
  }

  submit(): void {
    if (!this.complete || this.verifying) return;

    this.verifying = true;
    this.businessConfigService.verifyPin(this.digits).subscribe({
      next: (res) => {
        this.verifying = false;
        if (!res.valid) {
          this.error = 'PIN incorrecto.';
          this.digits = '';
          return;
        }
        const pin = this.digits;
        this.digits = '';
        this.authorized.emit(pin);
      },
      error: () => {
        this.verifying = false;
        this.error = 'No se pudo verificar el PIN.';
      },
    });
  }
}
