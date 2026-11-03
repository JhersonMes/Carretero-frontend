import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusinessConfigService } from '../../services/business-config.service';
import { PrinterService } from '../../services/printer.service';
import { BusinessConfig } from '../../model/business-config';

type Station = 'kitchen' | 'bar' | 'cashier';

interface PrinterCard {
  key: Station;
  title: string;
  hint: string;
}

/**
 * HU-12 · Configuracion de las ticketeras de cocina, barra y caja (CP-12-3-1).
 * Antes los datos solo se podian cambiar por API; ahora el administrador los
 * edita aqui y puede probar la conexion antes de guardar.
 */
@Component({
  selector: 'app-printers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './printers.component.html',
  styleUrl: './printers.component.css',
})
export class PrintersComponent implements OnInit {
  private configService = inject(BusinessConfigService);
  private printerService = inject(PrinterService);

  config: BusinessConfig | null = null;
  loading = true;
  saving = false;
  message = '';
  errorMessage = '';
  testing: Partial<Record<Station, boolean>> = {};
  testResult: Partial<Record<Station, { ok: boolean; text: string }>> = {};

  readonly cards: PrinterCard[] = [
    { key: 'kitchen', title: 'Cocina', hint: 'Comandas de platos de cocina y parrilla.' },
    { key: 'bar', title: 'Barra', hint: 'Comandas de bebidas.' },
    { key: 'cashier', title: 'Caja', hint: 'Pre-cuentas y comprobantes.' },
  ];

  ngOnInit(): void {
    this.configService.getConfig().subscribe({
      next: (c) => {
        this.config = c;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.message || 'No se pudo leer la configuración.';
      },
    });
  }

  ip(key: Station): string {
    return (this.config as any)?.[`${key}PrinterIp`] ?? '';
  }
  setIp(key: Station, value: string): void {
    (this.config as any)[`${key}PrinterIp`] = value;
  }
  port(key: Station): number {
    return (this.config as any)?.[`${key}PrinterPort`] ?? 9100;
  }
  setPort(key: Station, value: number): void {
    (this.config as any)[`${key}PrinterPort`] = value;
  }
  enabled(key: Station): boolean {
    return !!(this.config as any)?.[`${key}PrinterEnabled`];
  }
  setEnabled(key: Station, value: boolean): void {
    (this.config as any)[`${key}PrinterEnabled`] = value;
  }

  test(key: Station): void {
    const ip = this.ip(key).trim();
    if (!ip) {
      this.testResult[key] = { ok: false, text: 'Escribe la IP de la ticketera.' };
      return;
    }
    this.testing[key] = true;
    this.testResult[key] = undefined;
    this.printerService.testConnection(ip, Number(this.port(key)) || 9100).subscribe({
      next: (r) => {
        this.testing[key] = false;
        this.testResult[key] = r.reachable
          ? { ok: true, text: `La ticketera ${r.ip}:${r.port} responde.` }
          : { ok: false, text: `La ticketera ${r.ip}:${r.port} no responde. Revisa que esté encendida y en la misma red.` };
      },
      error: (err) => {
        this.testing[key] = false;
        this.testResult[key] = { ok: false, text: err?.message || 'No se pudo probar la conexión.' };
      },
    });
  }

  save(): void {
    if (!this.config) return;
    this.message = '';
    this.errorMessage = '';
    for (const c of this.cards) {
      const port = Number(this.port(c.key));
      if (this.enabled(c.key) && !this.ip(c.key).trim()) {
        this.errorMessage = `La ticketera de ${c.title.toLowerCase()} está activa pero no tiene IP.`;
        return;
      }
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        this.errorMessage = `El puerto de ${c.title.toLowerCase()} debe estar entre 1 y 65535.`;
        return;
      }
      this.setPort(c.key, port);
    }
    this.saving = true;
    this.configService.updateConfig(this.config).subscribe({
      next: (c) => {
        this.config = c;
        this.saving = false;
        this.message = 'Configuración guardada.';
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.message || 'No se pudo guardar la configuración.';
      },
    });
  }
}
