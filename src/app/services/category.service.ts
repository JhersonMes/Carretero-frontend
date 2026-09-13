import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Category } from '../model/category';
import { KitchenStation } from '../model/enums';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class CategoryService extends GenericService<Category> {
  protected override url: string = `${environment.HOST}/categories`;

  findAllActive() {
    return this.http.get<Category[]>(this.url);
  }

  findAllRaw() {
    return this.http.get<Category[]>(`${this.url}/all`);
  }

  /**
   * Cambia el area de la categoria. Con `moveProducts` arrastra tambien a sus
   * productos, que es lo que de verdad decide a que estacion sale la comanda.
   */
  changeStation(idCategory: number, station: KitchenStation, moveProducts: boolean) {
    return this.http.patch<Category>(`${this.url}/${idCategory}/station`, {
      station,
      moveProducts,
    });
  }
}
