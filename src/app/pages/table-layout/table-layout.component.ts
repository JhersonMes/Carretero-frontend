import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { DiningTableService } from '../../services/dining-table.service';
import { DiningTable } from '../../model/dining-table';

/**
 * Administracion del salon: alta, edicion y baja de mesas, y el plano en el que
 * el administrador las arrastra hasta dejarlas como estan fisicamente en el local.
 * Ese orden es el que despues ve el mesero en la pantalla de Salon.
 */
@Component({
  selector: 'app-table-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './table-layout.component.html',
  styleUrl: './table-layout.component.css',
})
export class TableLayoutComponent implements OnInit {
  private tableService = inject(DiningTableService);

  /** Mesas en servicio, en el orden del plano. Son las que se arrastran. */
  tables: DiningTable[] = [];
  /** Mesas dadas de baja: se listan aparte por si hay que reactivarlas. */
  inactiveTables: DiningTable[] = [];

  loading = true;
  saving = false;
  busy = false;

  /** Se activa al mover una mesa y se apaga al guardar: evita guardados en vano. */
  dirty = false;

  message = '';
  error = '';

  /**
   * Fallo al traer el listado. Se mantiene aparte de `error` porque significa algo
   * distinto: cuando esta puesto no sabemos que mesas hay, asi que la pantalla no
   * debe afirmar que el salon esta vacio.
   */
  loadError = '';

  // Alta
  newName = '';
  newCapacity = 4;

  // Edicion en linea
  editingId: number | null = null;
  editName = '';
  editCapacity = 4;

  showInactive = false;

  /** Orden tal como esta guardado en el servidor, para poder descartar cambios. */
  private savedOrder: DiningTable[] = [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.tableService.findAllForManagement().subscribe({
      next: (data) => {
        this.applyTables(data);
        this.loading = false;
      },
      error: (err) => {
        this.loadError =
          err?.message ||
          'No se pudo cargar el plano del salón. Revisa que el backend esté encendido.';
        this.loading = false;
      },
    });
  }

  retryLoad(): void {
    this.clearFeedback();
    this.load();
  }

  /**
   * Vuelve a traer el listado sin tocar los mensajes en pantalla.
   *
   * Se usa despues de una accion fallida: si el servidor rechazo la operacion, lo
   * que se ve puede estar desactualizado, y dejar la lista vieja junto al error
   * produce contradicciones ("ya existe esa mesa" sobre un salon aparentemente vacio).
   */
  private refreshSilently(): void {
    this.tableService.findAllForManagement().subscribe({
      next: (data) => this.applyTables(data),
      error: () => {
        /* el mensaje de la accion que fallo ya explica el problema */
      },
    });
  }

  private applyTables(data: DiningTable[]): void {
    this.tables = data.filter((t) => t.active !== false);
    this.inactiveTables = data.filter((t) => t.active === false);
    this.savedOrder = [...this.tables];
    this.dirty = false;
  }

  // ---------------------------------------------------------------- plano

  drop(event: CdkDragDrop<DiningTable[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.tables, event.previousIndex, event.currentIndex);
    this.dirty = true;
    this.clearFeedback();
  }

  saveOrder(): void {
    if (!this.dirty || this.saving) return;

    this.saving = true;
    this.clearFeedback();

    const orderedIds = this.tables
      .map((t) => t.idTable)
      .filter((id): id is number => id != null);

    this.tableService.reorder(orderedIds).subscribe({
      next: () => {
        this.savedOrder = [...this.tables];
        this.dirty = false;
        this.saving = false;
        this.message = 'Plano del salón guardado. Los meseros ya lo ven en este orden.';
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.message || 'No se pudo guardar el nuevo orden.';
        this.refreshSilently();
      },
    });
  }

  discardOrder(): void {
    this.tables = [...this.savedOrder];
    this.dirty = false;
    this.clearFeedback();
  }

  // ---------------------------------------------------------------- alta

  createTable(): void {
    const name = this.newName.trim();
    if (!name || this.busy) return;

    this.busy = true;
    this.clearFeedback();

    this.tableService.createTable(name, this.newCapacity).subscribe({
      next: (created) => {
        this.newName = '';
        this.newCapacity = 4;
        this.busy = false;
        this.message = `Mesa "${created.name}" agregada al final del plano.`;
        this.load();
      },
      error: (err) => {
        this.busy = false;
        this.error = err?.message || 'No se pudo crear la mesa.';
        this.refreshSilently();
      },
    });
  }

  // ---------------------------------------------------------------- edicion

  startEdit(table: DiningTable): void {
    this.editingId = table.idTable ?? null;
    this.editName = table.name;
    this.editCapacity = table.capacity;
    this.clearFeedback();
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(): void {
    if (this.editingId == null || this.busy) return;
    const name = this.editName.trim();
    if (!name) return;

    this.busy = true;
    this.clearFeedback();

    this.tableService.renameTable(this.editingId, name, this.editCapacity).subscribe({
      next: (updated) => {
        this.editingId = null;
        this.busy = false;
        this.message = `Mesa "${updated.name}" actualizada.`;
        this.load();
      },
      error: (err) => {
        this.busy = false;
        this.error = err?.message || 'No se pudo actualizar la mesa.';
        this.refreshSilently();
      },
    });
  }

  // ---------------------------------------------------------------- baja

  deactivate(table: DiningTable): void {
    if (table.idTable == null || this.busy) return;

    this.busy = true;
    this.clearFeedback();

    this.tableService.deactivate(table.idTable).subscribe({
      next: () => {
        this.busy = false;
        this.message = `Mesa "${table.name}" dada de baja. Su historial de ventas se conserva.`;
        this.load();
      },
      error: (err) => {
        this.busy = false;
        // El backend rechaza dar de baja una mesa con pedido abierto y explica por que.
        this.error = err?.message || 'No se pudo dar de baja la mesa.';
        this.refreshSilently();
      },
    });
  }

  activate(table: DiningTable): void {
    if (table.idTable == null || this.busy) return;

    this.busy = true;
    this.clearFeedback();

    this.tableService.activate(table.idTable).subscribe({
      next: () => {
        this.busy = false;
        this.message = `Mesa "${table.name}" reactivada al final del plano.`;
        this.load();
      },
      error: (err) => {
        this.busy = false;
        this.error = err?.message || 'No se pudo reactivar la mesa.';
        this.refreshSilently();
      },
    });
  }

  // ---------------------------------------------------------------- utilidades

  toggleInactive(): void {
    this.showInactive = !this.showInactive;
  }

  /** Numero visible de posicion: lo que el administrador espera ver, desde 1. */
  position(index: number): number {
    return index + 1;
  }

  trackByTable(_index: number, table: DiningTable): number {
    return table.idTable ?? -1;
  }

  private clearFeedback(): void {
    this.message = '';
    this.error = '';
  }
}
