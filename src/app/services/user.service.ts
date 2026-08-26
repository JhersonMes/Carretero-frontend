import { Injectable } from '@angular/core';
import { GenericSignalService } from './generic-signal.service';
import { User } from '../model/user';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService extends GenericSignalService<User> {
  protected override url: string = `${environment.HOST}/users`;
}
