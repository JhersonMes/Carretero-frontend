import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { Menu } from '../../model/menu';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './menu.component.html'
})
export class MenuComponent implements OnInit {
  private menuService = inject(MenuService);
  menus: Menu[] = [];

  ngOnInit(): void {
    this.loadMenus();
  }

  loadMenus(): void {
    this.menuService.findAll().subscribe((data) => {
      this.menus = data;
    });
  }

  deleteMenu(id: number): void {
    if (confirm('¿Está seguro de eliminar este platillo del menú?')) {
      this.menuService.delete(id).subscribe(() => this.loadMenus());
    }
  }
}
