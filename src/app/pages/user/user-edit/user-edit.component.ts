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
  idRole: number = 0;
  roles: Role[] = [];

  ngOnInit(): void {
    this.rolService.findAll().subscribe((r) => (this.roles = r));

    this.route.params.subscribe((params) => {
      this.id = params['id'];
      this.isEdit = !!this.id;
      if (this.isEdit) {
        this.userService.findById(this.id).subscribe((data) => {
          this.username = data.username;
          this.email = data.email;
          this.idRole = data.role?.idRole || 0;
        });
      }
    });
  }

  save(): void {
    const selectedRole = this.roles.find((r) => r.idRole === Number(this.idRole));
    const user: User = {
      idUser: this.id,
      username: this.username,
      email: this.email,
      password: this.password,
      role: selectedRole!
    };

    if (this.isEdit) {
      this.userService.update(this.id, user).subscribe(() => this.router.navigate(['/pages/user']));
    } else {
      this.userService.save(user).subscribe(() => this.router.navigate(['/pages/user']));
    }
  }
}
