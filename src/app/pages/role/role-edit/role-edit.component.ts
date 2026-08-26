import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RolService } from '../../../services/rol.service';
import { Role } from '../../../model/role';

@Component({
  selector: 'app-role-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './role-edit.component.html'
})
export class RoleEditComponent implements OnInit {
  private rolService = inject(RolService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  id: number = 0;
  isEdit: boolean = false;
  name: string = '';
  description: string = '';

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.id = params['id'];
      this.isEdit = !!this.id;
      if (this.isEdit) {
        this.rolService.findById(this.id).subscribe((data) => {
          this.name = data.name;
          this.description = data.description || '';
        });
      }
    });
  }

  save(): void {
    const role: Role = { idRole: this.id, name: this.name, description: this.description };
    if (this.isEdit) {
      this.rolService.update(this.id, role).subscribe(() => this.router.navigate(['/pages/role']));
    } else {
      this.rolService.save(role).subscribe(() => this.router.navigate(['/pages/role']));
    }
  }
}
