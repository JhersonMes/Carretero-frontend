import { Injectable } from '@angular/core';
import { GenericSignalService } from './generic-signal.service';
import { Ingredient } from '../model/ingredient';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class IngredientService extends GenericSignalService<Ingredient> {
  protected override url: string = `${environment.HOST}/ingredients`;
}
