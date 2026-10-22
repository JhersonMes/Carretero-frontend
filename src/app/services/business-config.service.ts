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

  /**
   * Comprueba el PIN antes de abrir una accion que lo exige. La operacion real
   * lo vuelve a validar en el servidor: esto es solo para no hacer llenar un
   * formulario a quien no esta autorizado.
   */
  verifyPin(pin: string) {
    return this.http.post<{ valid: boolean }>(`${this.url}/verify-pin`, { pin });
  }

  changeAdminPin(pin: string) {
    return this.http.put<void>(`${this.url}/admin-pin`, { pin });
  }
}
