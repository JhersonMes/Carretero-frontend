import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Category } from '../model/category';
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
}
