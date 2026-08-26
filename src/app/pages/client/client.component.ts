import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { Client } from '../../model/client';
import { DocumentType } from '../../model/enums';

const DOC_TYPES: DocumentType[] = ['DNI', 'RUC', 'CE', 'PASAPORTE', 'SIN_DOC'];

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client.component.html',
  styleUrl: './client.component.css',
})
export class ClientComponent implements OnInit {
  private clientService = inject(ClientService);

  readonly docTypes = DOC_TYPES;

  clients: Client[] = [];
  query = '';
  loading = true;
  errorMessage = '';

  newClient: Client = this.blank();
  editing: Client | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.clientService.findAll().subscribe({
      next: (data) => {
        this.clients = data;
        this.loading = false;
      },
      error: (err) => this.fail(err, 'No se pudieron cargar los clientes.'),
    });
  }

  get visibleClients(): Client[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.clients;
    return this.clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.docNumber ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
    );
  }

  create(): void {
    if (!this.newClient.name.trim()) {
      this.errorMessage = 'El cliente necesita un nombre o razon social.';
      return;
    }
    this.errorMessage = '';
    this.clientService.save(this.newClient).subscribe({
      next: () => {
        this.newClient = this.blank();
        this.load();
      },
      error: (err) => this.fail(err, 'No se pudo crear el cliente.'),
    });
  }

  startEdit(client: Client): void {
    this.editing = { ...client };
  }

  cancelEdit(): void {
    this.editing = null;
  }

  saveEdit(): void {
    if (!this.editing?.idClient) return;
    if (!this.editing.name.trim()) {
      this.errorMessage = 'El cliente necesita un nombre o razon social.';
      return;
    }
    this.errorMessage = '';
    this.clientService.update(this.editing.idClient, this.editing).subscribe({
      next: () => {
        this.editing = null;
        this.load();
      },
      error: (err) => this.fail(err, 'No se pudo guardar el cliente.'),
    });
  }

  remove(client: Client): void {
    if (!confirm(`Eliminar a "${client.name}"? Solo se puede si no tiene pedidos.`)) return;
    this.errorMessage = '';
    this.clientService.delete(client.idClient!).subscribe({
      next: () => this.load(),
      error: () =>
        (this.errorMessage =
          `No se pudo eliminar a "${client.name}". Si ya tiene pedidos o comprobantes, no se puede borrar.`),
    });
  }

  private fail(err: unknown, fallback: string): void {
    this.errorMessage = (err as { message?: string })?.message || fallback;
    this.loading = false;
  }

  private blank(): Client {
    return { docType: 'DNI', docNumber: '', name: '', phone: '', email: '', active: true };
  }
}
