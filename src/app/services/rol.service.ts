import { Injectable } from '@angular/core';
import { GenericSignalService } from './generic-signal.service';
import { Role } from '../model/role';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RolService extends GenericSignalService<Role> {
  protected override url: string = `${environment.HOST}/roles`;
}
