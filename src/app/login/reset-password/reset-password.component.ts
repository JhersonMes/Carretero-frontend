import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { LogoComponent } from '../../shared/logo/logo.component';

/**
 * Pantalla del enlace que llega por correo (RF-06): crea la contrasena nueva.
 * El enlace sirve una sola vez y vence a los 30 minutos (lo valida el servidor).
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LogoComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: '../register/register.component.css',
})
export class ResetPasswordComponent {
  private loginService = inject(LoginService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  token = '';
  password = '';
  confirm = '';
  errorMessage = '';
  successMessage = '';
  saving = false;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage = 'El enlace no es válido. Pide uno nuevo desde "¿Olvidaste tu contraseña?".';
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.password !== this.confirm) {
      this.errorMessage = 'Las dos contraseñas no coinciden.';
      return;
    }
    this.saving = true;
    this.loginService.resetPassword(this.token, this.password).subscribe({
      next: (res) => {
        this.successMessage = res.message;
        this.saving = false;
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err) => {
        this.errorMessage = err?.message || 'No se pudo cambiar la contraseña.';
        this.saving = false;
      },
    });
  }
}
