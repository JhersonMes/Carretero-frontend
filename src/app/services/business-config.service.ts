import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { BusinessConfig } from '../model/business-config';

@Injectable({
  providedIn: 'root',
})
export class BusinessConfigService {
  private http = inject(HttpClient);
  private url = `${environment.HOST}/business-config`;

  getConfig() {
    return this.http.get<BusinessConfig>(this.url);
  }

  updateConfig(config: BusinessConfig) {
    return this.http.put<BusinessConfig>(this.url, config);
  }
}
