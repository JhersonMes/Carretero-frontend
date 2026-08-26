import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PrinterService {
  private http = inject(HttpClient);
  private url = `${environment.HOST}/printers`;

  printKitchen(idOrder: number) {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.url}/order/${idOrder}/kitchen`,
      {}
    );
  }

  printBar(idOrder: number) {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.url}/order/${idOrder}/bar`,
      {}
    );
  }

  printPreAccount(idOrder: number) {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.url}/order/${idOrder}/pre-account`,
      {}
    );
  }

  printInvoice(idInvoice: number) {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.url}/invoice/${idInvoice}`,
      {}
    );
  }

  testConnection(ip: string, port: number = 9100) {
    return this.http.post<{
      reachable: boolean;
      ip: string;
      port: number;
      message: string;
    }>(`${this.url}/test`, { ip, port });
  }
}
