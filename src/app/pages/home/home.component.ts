import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  RankedGroup,
  ShiftStats,
  ShiftStatsService,
} from '../../services/shift-stats.service';
import { randomGreeting, randomSubtitle } from '../../shared/greetings';
import { roleDisplayOf } from '../../shared/role-display';

interface QuickLink {
  path: string;
  label: string;
  description: string;
}

const SALON_LINKS: QuickLink[] = [
  { path: '/pages/salon', label: 'Salon', description: 'Atiende las mesas y toma pedidos.' },
  { path: '/pages/quick-sale', label: 'Venta rapida', description: 'Cobra pedidos para llevar.' },
  { path: '/pages/cash-shift', label: 'Caja', description: 'Apertura, movimientos y cierre.' },
];

const STATION_LINKS: QuickLink[] = [
  { path: '/pages/kitchen', label: 'Comandas', description: 'Los pedidos pendientes de tu estacion.' },
];

const STATION_ROLES = ['COCINA', 'PARRILLA', 'BEBIDAS'];

/** Cada cuanto se refresca el ranking mientras el turno sigue abierto. */
const REFRESH_MS = 60_000;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private shiftStatsService = inject(ShiftStatsService);

  roleDisplay = roleDisplayOf;

  greeting = '';
  subtitle = '';
  today = new Date();

  stats: ShiftStats | null = null;
  loading = true;

  private refreshTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.setGreeting();
    this.loadStats();
    this.refreshTimer = setInterval(() => this.loadStats(), REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  /** Saludo automatico al entrar; no es una accion que el usuario dispare. */
  private setGreeting(): void {
    this.today = new Date();
    this.greeting = randomGreeting(this.displayName, this.today);
    this.subtitle = randomSubtitle();
  }

  /**
   * Fecha en castellano sin depender del LOCALE_ID global: el resto del sistema
   * formatea con patrones neutros (dd/MM), asi que no conviene cambiarlo aqui.
   */
  get todayLabel(): string {
    const label = this.today.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  /** Los accesos solo apuntan a modulos que el rol tiene habilitados en el menu. */
  get quickLinks(): QuickLink[] {
    return this.isStation ? STATION_LINKS : SALON_LINKS;
  }

  /** Rol en mayusculas, o cadena vacia si aun no cargo el usuario. */
  private get role(): string {
    return this.authService.roleName().toUpperCase();
  }

  get isStation(): boolean {
    return STATION_ROLES.includes(this.role);
  }

  /** Nombre del area tal como se muestra en pantalla ("Cocina", "Parrilla"...). */
  get areaLabel(): string {
    return roleDisplayOf(this.role).label;
  }

  get displayName(): string {
    const user = this.authService.currentUser();
    if (!user) return '';
    // Las cuentas de estacion no son personas sino el area misma ("Area Cocina"),
    // y quedarse con la primera palabra saludaba a "Area". Ahi va el nombre del
    // area; para el personal de salon basta el nombre de pila.
    if (this.isStation) return this.areaLabel;
    return (user.fullName || user.username || '').split(' ')[0];
  }

  /** Titulo del ranking. El area tiene uno solo; el salon separa platos y bebidas. */
  headingFor(group: RankedGroup): string {
    const size = this.stats?.rankingSize ?? 3;
    if (group.key === 'AREA') return `Top ${size} de ${this.areaLabel}`;
    if (group.key === 'BEBIDAS') return `Las ${size} bebidas mas vendidas`;
    return `Los ${size} platos mas vendidos`;
  }

  emptyMessageFor(group: RankedGroup): string {
    if (group.key === 'AREA') return `${this.areaLabel} aun no ha despachado nada en este turno.`;
    if (group.key === 'BEBIDAS') return 'Aun no se han vendido bebidas en este turno.';
    return 'Aun no se han vendido platos en este turno.';
  }

  /**
   * Caja ciega: mientras el turno sigue abierto no se muestra ningun importe.
   * Si el cajero pudiera ver cuanto lleva vendido, sabria de antemano si su
   * arqueo va a salir sobrado o faltante y podria cuadrarlo antes de contar.
   * Los montos recien aparecen cuando la caja ya esta cerrada.
   */
  get showsAmounts(): boolean {
    return !!this.stats?.shift && !this.stats.isOpen;
  }

  get hasRanking(): boolean {
    return !!this.stats?.rankings.some((group) => group.items.length > 0);
  }

  /** Texto del estado de caja que encabeza el resumen del turno. */
  get shiftStateLabel(): string {
    if (!this.stats?.shift) return 'Caja sin aperturar';
    return this.stats.isOpen ? 'Caja abierta' : 'Caja cerrada';
  }

  loadStats(): void {
    this.loading = !this.stats;
    // Una estacion solo mide lo suyo; salon y administracion ven todo el local.
    this.shiftStatsService.loadCurrentShiftStats(this.isStation ? this.role : null).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
