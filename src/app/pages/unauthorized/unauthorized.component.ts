import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="text-align: center; margin-top: 60px;">
      <h1 style="color: var(--carretero-red, #e31b22);">403 - Acceso no autorizado</h1>
      <p>No tienes permisos suficientes para acceder a este modulo.</p>
      <button routerLink="/pages/dashboard">Volver al panel principal</button>
    </div>
  `
})
export class UnauthorizedComponent {}
