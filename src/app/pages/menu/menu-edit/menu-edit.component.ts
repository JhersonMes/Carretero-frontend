import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuService } from '../../../services/menu.service';
import { Menu } from '../../../model/menu';

@Component({
  selector: 'app-menu-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './menu-edit.component.html'
})
export class MenuEditComponent implements OnInit {
  private menuService = inject(MenuService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  id: number = 0;
  isEdit: boolean = false;
  name: string = '';
  description: string = '';
  price: number = 0;
  category: string = 'General';
  available: boolean = true;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.id = params['id'];
      this.isEdit = !!this.id;
      if (this.isEdit) {
        this.menuService.findById(this.id).subscribe((data) => {
          this.name = data.name;
          this.description = data.description;
          this.price = data.price;
          this.category = data.category;
          this.available = data.available;
        });
      }
    });
  }

  save(): void {
    const menu: Menu = {
      idMenu: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      category: this.category,
      available: this.available
    };

    if (this.isEdit) {
      this.menuService.update(this.id, menu).subscribe(() => this.router.navigate(['/pages/menu']));
    } else {
      this.menuService.save(menu).subscribe(() => this.router.navigate(['/pages/menu']));
    }
  }
}
