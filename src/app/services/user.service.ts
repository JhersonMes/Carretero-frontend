import { Injectable } from '@angular/core';
import { GenericSignalService } from './generic-signal.service';
import { User } from '../model/user';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService extends GenericSignalService<User> {
  protected override url: string = `${environment.HOST}/users`;

  /** Baja logica (RN-04): la cuenta queda deshabilitada, no se borra. */
  deactivate(id: number) {
    return this.http.delete<User>(`${this.url}/${id}`);
  }

  activate(id: number) {
    return this.http.patch<User>(`${this.url}/${id}/activate`, {});
  }
}
