import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { RolService } from '../../../services/rol.service';
import { User } from '../../../model/user';
import { Role } from '../../../model/role';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-edit.component.html'
})
export class UserEditComponent implements OnInit {
  private userService = inject(UserService);
  private rolService = inject(RolService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  id: number = 0;
  isEdit: boolean = false;
  username: string = '';
  email: string = '';
  password?: string = '';
  fullName = '';
  phone = '';
  idRole: number = 0;
  errorMessage = '';
  roles: Role[] = [];
  /** Mientras llegan los datos de la cuenta el formulario no se muestra: si se escribia
   *  antes, la respuesta pisaba lo escrito y se guardaba el correo anterior. */
  loading = false;

  ngOnInit(): void {
    this.rolService.findAll().subscribe((r) => (this.roles = r));

    this.route.params.subscribe((params) => {
      this.id = params['id'];
      this.isEdit = !!this.id;
      if (this.isEdit) {
        this.loading = true;
        this.userService.findById(this.id).subscribe((data) => {
          this.loading = false;
          this.username = data.username;
          this.email = data.email;
          this.fullName = data.fullName ?? '';
          this.phone = data.phone ?? '';
          this.idRole = data.role?.idRole || 0;
        });
      }
    });
  }

  save(): void {
    this.errorMessage = '';
    const selectedRole = this.roles.find((r) => r.idRole === Number(this.idRole));
    if (!selectedRole) {
      this.errorMessage = 'Elige el rol de la cuenta.';
      return;
    }
    // Se envian nombre y telefono: antes el formulario no los mandaba y se borraban (CP-16-2-1).
    const user: User = {
      idUser: this.id,
      username: this.username,
      email: this.email,
      fullName: this.fullName,
      phone: this.phone,
      password: this.password,
      role: selectedRole,
    };

    const done = {
      next: () => this.router.navigate(['/pages/user']),
      error: (err: Error) => (this.errorMessage = err?.message || 'No se pudo guardar la cuenta.'),
    };
    if (this.isEdit) {
      this.userService.update(this.id, user).subscribe(done);
    } else {
      this.userService.save(user).subscribe(done);
    }
  }
}
