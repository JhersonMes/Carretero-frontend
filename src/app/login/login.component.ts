import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoginService } from '../services/login.service';
import { AuthService } from '../services/auth.service';
import { LogoComponent } from '../shared/logo/logo.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LogoComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private loginService = inject(LoginService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  username = '';
  password = '';
  errorMessage = '';
  showForgotPasswordInfo = false;
  /** Aviso cuando se llega aqui porque la sesion vencio (CP-03-3-2). */
  sessionMessage = '';

  // Recuperacion de contrasena por correo (RF-06)
  recoveryEmail = '';
  recoveryMessage = '';
  recoveryError = '';
  sendingRecovery = false;

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('sesion') === 'vencida') {
      this.sessionMessage = 'Tu sesión venció. No autorizado. Por favor inicie sesión.';
    }
  }

  sendRecovery(): void {
    this.recoveryMessage = '';
    this.recoveryError = '';
    const email = this.recoveryEmail.trim();
    if (!this.isValidEmail(email)) {
      this.recoveryError = 'Escribe un correo válido.';
      return;
    }
    this.sendingRecovery = true;
    this.loginService.forgotPassword(email).subscribe({
      next: (res) => {
        this.recoveryMessage = res.message;
        this.sendingRecovery = false;
      },
      error: (err) => {
        this.recoveryError = err?.message || 'No se pudo enviar el correo. Intenta de nuevo.';
        this.sendingRecovery = false;
      },
    });
  }

  /** usuario@dominio.ext sin espacios; sin regex para evitar backtracking. */
  private isValidEmail(email: string): boolean {
    const at = email.indexOf('@');
    if (at < 1 || at !== email.lastIndexOf('@') || /\s/.test(email)) return false;
    const domain = email.slice(at + 1);
    const dot = domain.lastIndexOf('.');
    return dot > 0 && dot < domain.length - 1;
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Ingresa tu usuario y tu contrasena';
      return;
    }

    this.loginService.login(this.username, this.password).subscribe({
      next: (data) => {
        if (!data.jwtToken) return;
        sessionStorage.setItem(environment.TOKEN_NAME, data.jwtToken);
        localStorage.setItem(environment.TOKEN_NAME, data.jwtToken);

        this.authService.fetchCurrentUser().subscribe({
          next: (user) => this.router.navigate([this.authService.resolveHomeRoute(user.role?.name)]),
          error: () => this.router.navigate(['/pages/dashboard']),
        });
      },
      error: () => {
        this.errorMessage = 'Credenciales invalidas. Intenta nuevamente.';
      },
    });
  }

  toggleForgotPassword() {
    this.showForgotPasswordInfo = !this.showForgotPasswordInfo;
  }
}
