import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unauthorized">
      <h1>No autorizado</h1>
      <p>Tu rol no tiene permiso para abrir esta pantalla.</p>
      <button type="button" class="back-btn" (click)="goHome()">Volver a mi pantalla de inicio</button>
    </div>
  `,
  styles: [`
    .unauthorized { text-align: center; margin-top: 60px; }
    .unauthorized h1 { color: var(--carretero-red, #e31b22); }
    .back-btn { background: var(--carretero-red, #e31b22); color: #fff; border: none; }
  `],
})
export class UnauthorizedComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  goHome(): void {
    this.router.navigate([this.auth.resolveHomeRoute(this.auth.roleName())]);
  }
}
