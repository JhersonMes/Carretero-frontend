import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class KitchenSocketService {
  private client: Client | null = null;
  private readonly updates = new Subject<void>();
  readonly updates$ = this.updates.asObservable();

  connect(): void {
    if (this.client?.active) return;

    const token =
      sessionStorage.getItem(environment.TOKEN_NAME) || localStorage.getItem(environment.TOKEN_NAME);

    this.client = new Client({
      brokerURL: `${environment.HOST.replace(/^http/, 'ws')}/ws`,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        this.client?.subscribe('/topic/kitchen', () => this.updates.next());
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
  }
}
