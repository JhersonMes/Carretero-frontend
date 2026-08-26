import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CashShiftService } from '../../services/cash-shift.service';
import { CashShift } from '../../model/cash-shift';

const AMOUNT_PRESETS = [100, 200];

@Component({
  selector: 'app-cash-shift',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-shift.component.html',
  styleUrl: './cash-shift.component.css',
})
export class CashShiftComponent implements OnInit {
  private cashShiftService = inject(CashShiftService);

  activeShift: CashShift | null = null;
  loading = true;
  errorMessage = '';

  readonly amountPresets = AMOUNT_PRESETS;

  showOpenModal = false;
  openAmount: number | null = null;
  openNotes = '';
  opening = false;

  showCloseModal = false;
  closeAmount: number | null = null;
  closeNotes = '';
  closing = false;

  ngOnInit(): void {
    this.loadShift();
  }

  loadShift(): void {
    this.loading = true;
    this.cashShiftService.getActiveShift().subscribe({
      next: (shift) => {
        this.activeShift = shift;
        this.loading = false;
      },
      error: () => {
        this.activeShift = null;
        this.loading = false;
      },
    });
  }

  // --- Apertura de caja ---

  openOpenModal(): void {
    this.openAmount = null;
    this.openNotes = '';
    this.errorMessage = '';
    this.showOpenModal = true;
  }

  closeOpenModal(): void {
    this.showOpenModal = false;
  }

  pickPresetAmount(amount: number): void {
    this.openAmount = amount;
  }

  confirmOpenShift(): void {
    if (!this.openAmount || this.openAmount <= 0) {
      this.errorMessage = 'Ingresa un monto valido para aperturar la caja.';
      return;
    }

    this.opening = true;
    this.cashShiftService.openShift(this.openAmount, this.openNotes || undefined).subscribe({
      next: (shift) => {
        this.activeShift = shift;
        this.opening = false;
        this.showOpenModal = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudo aperturar la caja.';
        this.opening = false;
      },
    });
  }

  // --- Cierre de caja ---

  openCloseModal(): void {
    this.closeAmount = null;
    this.closeNotes = '';
    this.errorMessage = '';
    this.showCloseModal = true;
  }

  closeCloseModal(): void {
    this.showCloseModal = false;
  }

  confirmCloseShift(): void {
    if (!this.activeShift?.idCashShift) return;
    if (this.closeAmount === null || this.closeAmount < 0) {
      this.errorMessage = 'Ingresa el monto contado en caja.';
      return;
    }

    this.closing = true;
    this.cashShiftService
      .closeShift(this.activeShift.idCashShift, this.closeAmount, this.closeNotes || undefined)
      .subscribe({
        next: () => {
          this.activeShift = null;
          this.closing = false;
          this.showCloseModal = false;
        },
        error: (err) => {
          this.errorMessage = err?.message || 'No se pudo cerrar la caja.';
          this.closing = false;
        },
      });
  }
}
