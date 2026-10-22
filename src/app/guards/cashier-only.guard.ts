import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Delivery es una pantalla de caja: ahi se registra al cliente, se fija el costo
 * del reparto y se cobra. Ocultarla del menu no alcanza, porque la ruta se puede
 * escribir a mano, asi que el rol tambien se comprueba al activar.
 */
export const cashierOnlyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const decide = (roleName: string | undefined) =>
    (roleName ?? '').toUpperCase() === 'CAJERO'
      ? true
      : router.createUrlTree(['/pages/unauthorized']);

  const current = authService.currentUser();
  if (current) return decide(current.role?.name);

  // Al recargar directo sobre /pages/delivery el guard corre antes de que el
  // layout pida el usuario, asi que aqui se resuelve la sesion antes de decidir.
  return authService.fetchCurrentUser().pipe(
    map((user) => decide(user.role?.name)),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
