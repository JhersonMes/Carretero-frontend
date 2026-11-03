import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ILoginRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private http = inject(HttpClient);
  private url: string = `${environment.HOST}/login`;

  login(username: string, password: string) {
    const body: ILoginRequest = { username, password };
    return this.http.post<{ jwtToken: string }>(this.url, body);
  }

  /** Pide el enlace de recuperacion (RF-06). Responde igual exista o no el correo. */
  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(`${environment.HOST}/auth/forgot-password`, { email });
  }

  /** Crea la contrasena nueva con el enlace recibido por correo. */
  resetPassword(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${environment.HOST}/auth/reset-password`, { token, newPassword });
  }

  /** El colaborador cambia su propia contrasena (CP-16-4-1). */
  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put<{ message: string }>(`${environment.HOST}/auth/password`, { currentPassword, newPassword });
  }

  /** Borra la sesion guardada sin llamar al servidor (sesion vencida). */
  clearSession() {
    sessionStorage.removeItem(environment.TOKEN_NAME);
    localStorage.removeItem(environment.TOKEN_NAME);
  }

  register(username: string, email: string, password: string) {
    const body = { username, email, password };
    return this.http.post<any>(`${environment.HOST}/register`, body);
  }

  logout() {
    // El token debe seguir presente cuando sale esta peticion (el interceptor lo adjunta),
    // por eso se limpia recien al finalizar, no antes.
    return this.http.get(`${environment.HOST}/auth/logout`).pipe(
      finalize(() => {
        sessionStorage.removeItem(environment.TOKEN_NAME);
        localStorage.removeItem(environment.TOKEN_NAME);
      })
    );
  }

  showUserInfo() {
    return this.http.get<any>(`${environment.HOST}/auth/user`);
  }

  isLoggedIn(): boolean {
    const token = sessionStorage.getItem(environment.TOKEN_NAME) || localStorage.getItem(environment.TOKEN_NAME);
    return !!token;
  }
}
