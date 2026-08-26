import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { KitchenStation } from '../model/enums';
import { PriceHistory } from '../model/price-history';
import { Product } from '../model/product';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService extends GenericService<Product> {
  protected override url: string = `${environment.HOST}/products`;

  findByCategory(idCategory: number) {
    return this.http.get<Product[]>(`${this.url}/category/${idCategory}`);
  }

  /** Incluye los productos desactivados; solo para la pantalla de administracion. */
  findAllRaw() {
    return this.http.get<Product[]>(`${this.url}/all`);
  }

  findByStation(station: KitchenStation) {
    return this.http.get<Product[]>(`${this.url}/station/${station}`);
  }

  updatePrice(idProduct: number, price: number) {
    return this.http.patch<Product>(`${this.url}/${idProduct}/price`, {
      price,
    });
  }

  getPriceHistory(idProduct: number) {
    return this.http.get<PriceHistory[]>(
      `${this.url}/${idProduct}/price-history`
    );
  }
}
