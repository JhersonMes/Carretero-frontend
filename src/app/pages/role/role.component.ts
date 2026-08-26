import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { RolService } from '../../services/rol.service';
import { Role } from '../../model/role';

@Component({
  selector: 'app-role',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './role.component.html'
})
export class RoleComponent implements OnInit {
  public rolService = inject(RolService);
  roles: Role[] = [];

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.rolService.findAll().subscribe((data) => {
      this.roles = data;
      this.rolService.setListChange(data);
    });
  }

  deleteRole(id: number): void {
    if (confirm('¿Está seguro de eliminar este rol?')) {
      this.rolService.delete(id).subscribe(() => {
        this.loadRoles();
      });
    }
  }
}
