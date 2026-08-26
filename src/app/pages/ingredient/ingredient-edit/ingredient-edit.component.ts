import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IngredientService } from '../../../services/ingredient.service';
import { Ingredient } from '../../../model/ingredient';

@Component({
  selector: 'app-ingredient-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ingredient-edit.component.html'
})
export class IngredientEditComponent implements OnInit {
  private ingredientService = inject(IngredientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  id: number = 0;
  isEdit: boolean = false;
  name: string = '';
  stock: number = 0;
  unit: string = 'kg';
  unitCost: number = 0;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.id = params['id'];
      this.isEdit = !!this.id;
      if (this.isEdit) {
        this.ingredientService.findById(this.id).subscribe((data) => {
          this.name = data.name;
          this.stock = data.stock;
          this.unit = data.unit;
          this.unitCost = data.unitCost;
        });
      }
    });
  }

  save(): void {
    const ing: Ingredient = {
      idIngredient: this.id,
      name: this.name,
      stock: this.stock,
      unit: this.unit,
      unitCost: this.unitCost
    };

    if (this.isEdit) {
      this.ingredientService.update(this.id, ing).subscribe(() => this.router.navigate(['/pages/ingredient']));
    } else {
      this.ingredientService.save(ing).subscribe(() => this.router.navigate(['/pages/ingredient']));
    }
  }
}
