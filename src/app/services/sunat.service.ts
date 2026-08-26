import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { DniRucQueryResponse } from '../model/dni-ruc-query';

@Injectable({
  providedIn: 'root',
})
export class SunatService {
  private http = inject(HttpClient);
  private url = `${environment.HOST}/sunat`;

  queryDocument(docNumber: string) {
    return this.http.get<DniRucQueryResponse>(`${this.url}/query/${docNumber}`);
  }
}
