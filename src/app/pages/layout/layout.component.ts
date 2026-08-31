import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { AuthService } from '../../services/auth.service';
import { LogoComponent } from '../../shared/logo/logo.component';
import { roleDisplayOf } from '../../shared/role-display';

interface NavItem {
  path: string;
  label: string;
}

const ADMIN_NAV: NavItem[] = [
  { path: '/pages/dashboard', label: 'Panel principal' },
  { path: '/pages/role', label: 'Roles' },
  { path: '/pages/user', label: 'Usuarios' },
  { path: '/pages/catalog', label: 'Carta' },
  { path: '/pages/product', label: 'Precios' },
  { path: '/pages/client', label: 'Clientes' },
  { path: '/pages/table-layout', label: 'Distribucion del salon' },
  { path: '/pages/ingredient', label: 'Ingredientes' },
  { path: '/pages/menu', label: 'Menus' },
  { path: '/pages/payment-method', label: 'Metodos de pago' },
  { path: '/pages/payment', label: 'Historial de pagos' },
];

const MESERO_NAV: NavItem[] = [
  { path: '/pages/home', label: 'Inicio' },
  { path: '/pages/salon', label: 'Salon' },
  { path: '/pages/quick-sale', label: 'Venta rapida' },
  { path: '/pages/cash-shift', label: 'Caja' },
];

const KITCHEN_NAV: NavItem[] = [
  { path: '/pages/home', label: 'Inicio' },
  { path: '/pages/kitchen', label: 'Comandas' },
];

const STATION_ROLES = ['COCINA', 'PARRILLA', 'BEBIDAS'];

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LogoComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent {
  private loginService = inject(LoginService);
  public authService = inject(AuthService);
  private router = inject(Router);

  roleDisplay = roleDisplayOf;

  get navItems(): NavItem[] {
    const role = this.authService.roleName().toUpperCase();
    if (role === 'MESERO' || role === 'CAJERO') return MESERO_NAV;
    if (STATION_ROLES.includes(role)) return KITCHEN_NAV;
    return ADMIN_NAV;
  }

  ngOnInit() {
    if (this.loginService.isLoggedIn()) {
      this.authService.fetchCurrentUser().subscribe();
    }
  }

  logout() {
    this.loginService.logout().subscribe({
      next: () => {
        this.authService.clearCurrentUser();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearCurrentUser();
        this.router.navigate(['/login']);
      }
    });
  }
}
