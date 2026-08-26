import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Flavor } from '../model/flavor';

@Injectable({ providedIn: 'root' })
export class FlavorService {
  private http = inject(HttpClient);
  private url = `${environment.HOST}/flavors`;

  /** Opciones que debe ofrecer la venta: las del producto, o las de su categoria. */
  findForProduct(idProduct: number) {
    return this.http.get<Flavor[]>(`${this.url}/product/${idProduct}`);
  }

  /** Solo las propias del producto, incluidas inactivas (administracion). */
  findAllOfProduct(idProduct: number) {
    return this.http.get<Flavor[]>(`${this.url}/product/${idProduct}/all`);
  }

  /** Solo las compartidas por la categoria (administracion). */
  findByCategory(idCategory: number) {
    return this.http.get<Flavor[]>(`${this.url}/category/${idCategory}`);
  }

  create(flavor: Flavor) {
    return this.http.post<Flavor>(this.url, flavor);
  }

  update(idFlavor: number, flavor: Flavor) {
    return this.http.put<Flavor>(`${this.url}/${idFlavor}`, flavor);
  }

  delete(idFlavor: number) {
    return this.http.delete<void>(`${this.url}/${idFlavor}`);
  }
}
