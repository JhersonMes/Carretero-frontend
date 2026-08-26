import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Page } from '../model/page';

@Injectable({
  providedIn: 'root',
})
export abstract class GenericService<T> {
  protected http = inject(HttpClient);
  protected abstract url: string;

  findAll() {
    return this.http.get<T[]>(this.url);
  }

  findAllPageable(page: number, size: number) {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<T>>(`${this.url}/pageable`, { params });
  }

  findById(id: number) {
    return this.http.get<T>(`${this.url}/${id}`);
  }

  save(t: T) {
    return this.http.post<T>(this.url, t);
  }

  update(id: number, t: T) {
    return this.http.put<T>(`${this.url}/${id}`, t);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  patch(id: number, body: Partial<T>) {
    return this.http.patch<T>(`${this.url}/${id}`, body);
  }
}
