import { Injectable } from '@angular/core';
import { GenericSignalService } from './generic-signal.service';
import { PaymentMethod } from '../model/payment-method';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaymentMethodService extends GenericSignalService<PaymentMethod> {
  protected override url: string = `${environment.HOST}/payment-methods`;
}
