import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Address } from '../model/address';
import { Client } from '../model/client';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class ClientService extends GenericService<Client> {
  protected override url: string = `${environment.HOST}/clients`;

  search(query: string) {
    return this.http.get<Client[]>(`${this.url}/search`, {
      params: { q: query },
    });
  }

  findByDocNumber(docNumber: string) {
    return this.http.get<Client>(`${this.url}/doc/${docNumber}`);
  }

  findByPhone(phone: string) {
    return this.http.get<Client>(`${this.url}/phone/${phone}`);
  }

  getAddresses(idClient: number) {
    return this.http.get<Address[]>(`${this.url}/${idClient}/addresses`);
  }

  addAddress(idClient: number, address: Address) {
    return this.http.post<Address>(
      `${this.url}/${idClient}/addresses`,
      address
    );
  }
}
