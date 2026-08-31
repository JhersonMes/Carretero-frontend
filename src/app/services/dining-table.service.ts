import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { DiningTable } from '../model/dining-table';
import { TableBoard } from '../model/table-board';
import { TableStatus } from '../model/enums';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class DiningTableService extends GenericService<DiningTable> {
  protected override url: string = `${environment.HOST}/tables`;

  findByStatus(status: TableStatus) {
    return this.http.get<DiningTable[]>(`${this.url}/status/${status}`);
  }

  /** Mesas en el orden del plano, con el resumen del pedido activo de cada una. */
  findBoard() {
    return this.http.get<TableBoard[]>(`${this.url}/board`);
  }

  /** Guarda el nuevo orden del plano. Solo el administrador puede llamarlo. */
  reorder(orderedTableIds: number[]) {
    return this.http.put<TableBoard[]>(`${this.url}/reorder`, { orderedTableIds });
  }

  /** Listado de administracion: incluye las mesas dadas de baja. */
  findAllForManagement() {
    return this.http.get<DiningTable[]>(`${this.url}/manage`);
  }

  createTable(name: string, capacity: number) {
    return this.http.post<DiningTable>(this.url, { name, capacity });
  }

  renameTable(idTable: number, name: string, capacity: number) {
    return this.http.put<DiningTable>(`${this.url}/${idTable}`, { name, capacity });
  }

  /** Baja logica: la mesa sale del salon pero conserva su historial. */
  deactivate(idTable: number) {
    return this.http.delete<DiningTable>(`${this.url}/${idTable}`);
  }

  activate(idTable: number) {
    return this.http.patch<DiningTable>(`${this.url}/${idTable}/activate`, {});
  }

  updateStatus(idTable: number, status: TableStatus) {
    return this.http.patch<DiningTable>(`${this.url}/${idTable}/status`, {
      status,
    });
  }
}
