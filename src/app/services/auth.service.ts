import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { LoginService } from './login.service';
import { User } from '../model/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly loginService = inject(LoginService);

  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly roleName = computed(() => this._currentUser()?.role?.name ?? '');

  fetchCurrentUser() {
    return this.loginService.showUserInfo().pipe(tap((data: User) => this._currentUser.set(data)));
  }

  clearCurrentUser(): void {
    this._currentUser.set(null);
  }

  resolveHomeRoute(roleName: string | undefined | null): string {
    const role = (roleName ?? '').toUpperCase();
    if (role === 'MESERO' || role === 'CAJERO') return '/pages/salon';
    if (role === 'COCINA' || role === 'PARRILLA' || role === 'BEBIDAS') return '/pages/kitchen';
    return '/pages/dashboard';
  }
}
