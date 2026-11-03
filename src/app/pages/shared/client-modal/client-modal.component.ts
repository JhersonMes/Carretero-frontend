import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../../services/client.service';
import { SunatService } from '../../../services/sunat.service';
import { DniRucQueryResponse } from '../../../model/dni-ruc-query';
import { Client } from '../../../model/client';
import { DocumentType } from '../../../model/enums';

@Component({
  selector: 'app-client-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-modal.component.html',
  styleUrl: './client-modal.component.css',
})
export class ClientModalComponent implements OnInit {
  private clientService = inject(ClientService);
  private sunatService = inject(SunatService);

  @Input() currentClient: Client | null = null;
  @Output() clientSelected = new EventEmitter<Client | null>();
  @Output() closed = new EventEmitter<void>();

  searchQuery = '';
  clients: Client[] = [];
  filteredClients: Client[] = [];
  loading = false;
  creating = false;
  errorMessage = '';

  newClient: Partial<Client> = {
    docType: 'DNI',
    docNumber: '',
    name: '',
    phone: '',
  };

  docTypes: DocumentType[] = ['DNI', 'RUC', 'SIN_DOC', 'CE', 'PASAPORTE'];

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.loading = true;
    this.clientService.findAll().subscribe({
      next: (list) => {
        this.clients = list;
        this.filterClients();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  filterClients(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredClients = this.clients.slice(0, 20);
      return;
    }
    this.filteredClients = this.clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.docNumber && c.docNumber.includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }

  onSearch(): void {
    this.filterClients();
    this.scheduleLookup();
  }

  // ============ Consulta de DNI/RUC nuevos (HU-13, CP-13-2-1 y CP-13-3-1) ============
  // Si se escribe un DNI (8 digitos) o RUC (11) que no esta en el padron, se consulta el
  // servicio de RENIEC/SUNAT configurado. Si responde, el backend lo guarda en el padron
  // y aparece en la lista; si no hay token, se muestra el dato de prueba con un aviso.
  lookup: DniRucQueryResponse | null = null;
  lookupLoading = false;
  lookupSimulated = false;
  private lookupTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleLookup(): void {
    if (this.lookupTimer) clearTimeout(this.lookupTimer);
    this.lookup = null;
    const doc = this.searchQuery.trim();
    if (!/^(\d{8}|\d{11})$/.test(doc) || this.filteredClients.length > 0) return;
    this.lookupTimer = setTimeout(() => this.queryDocument(doc), 400);
  }

  queryDocument(doc: string): void {
    this.lookupLoading = true;
    this.sunatService.queryDocument(doc).subscribe({
      next: (res) => {
        this.lookupLoading = false;
        if (this.searchQuery.trim() !== doc) return;
        this.lookupSimulated = !res.fromCache && (res.message ?? '').toLowerCase().includes('prueba');
        if (res.success && !this.lookupSimulated) {
          // El backend ya lo guardo en el padron: se recarga la lista y queda para elegirlo.
          this.clientService.findAll().subscribe((list) => {
            this.clients = list;
            this.filterClients();
            if (this.filteredClients.length === 0) this.lookup = res;
          });
          return;
        }
        this.lookup = res.success ? res : null;
      },
      error: () => {
        this.lookupLoading = false;
        this.lookup = null;
      },
    });
  }

  /** Registra el resultado de la consulta como cliente y lo elige para el cobro. */
  useLookup(): void {
    if (!this.lookup) return;
    this.newClient = {
      docType: this.lookup.docType || (this.lookup.docNumber.length === 11 ? 'RUC' : 'DNI'),
      docNumber: this.lookup.docNumber,
      name: this.lookup.name,
      phone: '',
    };
    this.saveNewClient();
  }

  select(client: Client | null): void {
    this.clientSelected.emit(client);
    this.close();
  }

  toggleCreate(): void {
    this.creating = !this.creating;
    this.errorMessage = '';
  }

  saveNewClient(): void {
    if (!this.newClient.name?.trim()) {
      this.errorMessage = 'El nombre es obligatorio.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const payload: Client = {
      docType: this.newClient.docType || 'DNI',
      docNumber: this.newClient.docNumber?.trim() || undefined,
      name: this.newClient.name.trim(),
      phone: this.newClient.phone?.trim() || undefined,
      active: true,
    };

    this.clientService.save(payload).subscribe({
      next: (saved) => {
        this.loading = false;
        this.select(saved);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.message || 'No se pudo registrar el cliente.';
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
