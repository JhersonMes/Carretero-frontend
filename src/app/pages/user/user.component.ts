import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { UserService } from '../../services/user.service';
import { User } from '../../model/user';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css',
})
export class UserComponent implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  users: User[] = [];
  message = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadUsers();
    // Al volver del formulario (Guardar) el listado se recarga solo: antes la cuenta
    // nueva o el correo corregido aparecian recien al recargar la pagina (CP-16-1-1).
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd && e.urlAfterRedirects === '/pages/user'),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.loadUsers());
  }

  loadUsers(): void {
    this.userService.findAll().subscribe((data) => {
      this.users = data;
    });
  }

  /** Baja logica (RN-04): la cuenta deja de poder entrar, pero su historial se conserva. */
  deactivate(u: User): void {
    if (!confirm(`¿Dar de baja la cuenta "${u.username}"? Ya no podrá iniciar sesión; sus ventas se conservan.`)) return;
    this.message = this.errorMessage = '';
    this.userService.deactivate(u.idUser).subscribe({
      next: () => {
        this.message = `Cuenta "${u.username}" dada de baja.`;
        this.loadUsers();
      },
      error: (err) => (this.errorMessage = err?.message || 'No se pudo dar de baja la cuenta.'),
    });
  }

  activate(u: User): void {
    this.message = this.errorMessage = '';
    this.userService.activate(u.idUser).subscribe({
      next: () => {
        this.message = `Cuenta "${u.username}" reactivada.`;
        this.loadUsers();
      },
      error: (err) => (this.errorMessage = err?.message || 'No se pudo reactivar la cuenta.'),
    });
  }
}
