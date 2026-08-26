import { Injectable } from '@angular/core';
import { GenericSignalService } from './generic-signal.service';
import { Menu } from '../model/menu';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MenuService extends GenericSignalService<Menu> {
  protected override url: string = `${environment.HOST}/menus`;
}
