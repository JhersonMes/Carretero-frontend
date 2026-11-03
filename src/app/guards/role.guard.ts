import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Comprueba el rol al entrar a una pantalla. Ocultar la opcion del menu no basta,
 * porque la direccion se puede escribir a mano (CP-03-4-1): sin rol permitido se
 * muestra la pantalla "No autorizado".
 */
export const roleGuard = (allowed: string[]): CanActivateFn => () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedUpper = allowed.map((r) => r.toUpperCase());

  const decide = (roleName: string | undefined) =>
    allowedUpper.includes((roleName ?? '').toUpperCase()) ? true : router.createUrlTree(['/pages/unauthorized']);

  const current = authService.currentUser();
  if (current) return decide(current.role?.name);

  return authService.fetchCurrentUser().pipe(
    map((user) => decide(user.role?.name)),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};

export const ADMIN = ['ADMIN'];
export const SALON_ROLES = ['ADMIN', 'CAJERO', 'MESERO'];
export const STATION_ROLES = ['ADMIN', 'COCINA', 'PARRILLA', 'BEBIDAS'];
