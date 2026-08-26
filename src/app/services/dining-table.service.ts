import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { DiningTable } from '../model/dining-table';
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

  updateStatus(idTable: number, status: TableStatus) {
    return this.http.patch<DiningTable>(`${this.url}/${idTable}/status`, {
      status,
    });
  }
}
