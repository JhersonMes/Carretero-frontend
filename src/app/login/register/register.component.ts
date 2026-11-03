import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { LogoComponent } from '../../shared/logo/logo.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LogoComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private loginService = inject(LoginService);
  private router = inject(Router);

  username = '';
  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';

  onSubmit() {
    if (!this.username || !this.email || !this.password) {
      this.errorMessage = 'Todos los campos son obligatorios';
      return;
    }

    this.loginService.register(this.username, this.email, this.password).subscribe({
      next: () => {
        this.successMessage = 'Registro exitoso. Redirigiendo al login...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        // El servidor explica que fallo (usuario corto, correo invalido, usuario repetido).
        // Antes solo se veia un mensaje generico (CP-02-2-1).
        const detail = this.friendlyDetail(err?.message);
        this.errorMessage = detail ? `Error al registrar usuario: ${detail}` : 'Error al registrar usuario';
      }
    });
  }

  /** "username: El nombre..., email: El email..." -> "El nombre... · El email..." */
  private friendlyDetail(message: string | undefined): string {
    if (!message || message.startsWith('Ocurrió un error')) return '';
    return message
      .split(/,\s*(?=[a-zA-Z]+:)/)
      .map((part) => part.replace(/^[a-zA-Z]+:\s*/, '').trim())
      .filter(Boolean)
      .join(' · ');
  }
}
