import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Address } from '../model/address';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class AddressService extends GenericService<Address> {
  protected override url: string = `${environment.HOST}/addresses`;

  findByClient(idClient: number) {
    return this.http.get<Address[]>(`${this.url}/client/${idClient}`);
  }
}
