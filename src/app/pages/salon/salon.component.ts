import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DiningTableService } from '../../services/dining-table.service';
import { DiningTable } from '../../model/dining-table';
import { TableStatus } from '../../model/enums';

type SalonTab = 'MESA' | 'BARRA';

interface StatusMeta {
  label: string;
  color: string;
}

const STATUS_META: Record<TableStatus, StatusMeta> = {
  LIBRE: { label: 'Libre', color: '#2f9e58' },
  OCUPADA: { label: 'Ocupada', color: '#e31b22' },
  PIDIENDO_CUENTA: { label: 'Pidiendo cuenta', color: '#f0a202' },
  RESERVADA: { label: 'Reservada', color: '#3a6ea5' },
};

@Component({
  selector: 'app-salon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './salon.component.html',
  styleUrl: './salon.component.css',
})
export class SalonComponent implements OnInit {
  private tableService = inject(DiningTableService);
  private router = inject(Router);

  tables: DiningTable[] = [];
  tab: SalonTab = 'MESA';
  readonly statusMeta = STATUS_META;

  ngOnInit(): void {
    this.tableService.findAll().subscribe((data) => {
      this.tables = data;
    });
  }

  get visibleTables(): DiningTable[] {
    return this.tables.filter((t) => this.isBar(t) === (this.tab === 'BARRA'));
  }

  isBar(table: DiningTable): boolean {
    return table.name.toLowerCase().includes('barra');
  }

  selectTab(tab: SalonTab): void {
    this.tab = tab;
  }

  openTable(table: DiningTable): void {
    if (!table.idTable) return;
    this.router.navigate(['/pages/salon', table.idTable]);
  }
}
