import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { IngredientService } from '../../services/ingredient.service';
import { Ingredient } from '../../model/ingredient';

@Component({
  selector: 'app-ingredient',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './ingredient.component.html'
})
export class IngredientComponent implements OnInit {
  private ingredientService = inject(IngredientService);
  ingredients: Ingredient[] = [];

  ngOnInit(): void {
    this.loadIngredients();
  }

  loadIngredients(): void {
    this.ingredientService.findAll().subscribe((data) => {
      this.ingredients = data;
    });
  }

  deleteIngredient(id: number): void {
    if (confirm('¿Está seguro de eliminar este ingrediente?')) {
      this.ingredientService.delete(id).subscribe(() => this.loadIngredients());
    }
  }
}
