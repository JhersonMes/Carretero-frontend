import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../services/login.service';
import { AuthService } from '../services/auth.service';
import { LogoComponent } from '../shared/logo/logo.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LogoComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private loginService = inject(LoginService);
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  errorMessage = '';
  showForgotPasswordInfo = false;

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
