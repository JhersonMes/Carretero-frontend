import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

/** Peticiones donde un 401 significa "datos equivocados", no "sesion vencida". */
const PUBLIC_ENDPOINTS = ['/login', '/register', '/auth/forgot-password', '/auth/reset-password', '/auth/password'];

export const serverErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      let errorMessage = 'Ocurrió un error en el servidor';
      if (error.status === 401) {
        errorMessage = 'No autorizado. Por favor inicie sesión.';
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.status === 403) {
        errorMessage = 'No tiene permisos para realizar esta acción.';
      }

      // Token vencido (5 h) o cuenta dada de baja: el servidor responde 401. Antes la
      // pantalla seguia como si nada (p. ej. Caja decia "No hay una caja aperturada").
      // Ahora se cierra la sesion y se vuelve al login con el aviso (CP-03-3-2).
      const isPublic = PUBLIC_ENDPOINTS.some((path) => req.url.endsWith(path));
      if (error.status === 401 && !isPublic) {
        sessionStorage.removeItem(environment.TOKEN_NAME);
        localStorage.removeItem(environment.TOKEN_NAME);
        if (!router.url.startsWith('/login')) {
          router.navigate(['/login'], { queryParams: { sesion: 'vencida' } });
        }
      }

      console.error('Error Intercepted:', errorMessage, error);
      return throwError(() => new Error(errorMessage));
    })
  );
};
