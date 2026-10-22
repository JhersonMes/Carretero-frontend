import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../../services/client.service';
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
