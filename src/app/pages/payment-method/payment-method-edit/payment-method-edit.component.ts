import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaymentMethodService } from '../../../services/payment-method.service';
import { PaymentMethod } from '../../../model/payment-method';

@Component({
  selector: 'app-payment-method-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './payment-method-edit.component.html'
})
export class PaymentMethodEditComponent implements OnInit {
  private paymentMethodService = inject(PaymentMethodService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  id: number = 0;
  isEdit: boolean = false;
  name: string = '';
  description: string = '';
  active: boolean = true;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.id = params['id'];
      this.isEdit = !!this.id;
      if (this.isEdit) {
        this.paymentMethodService.findById(this.id).subscribe((data) => {
          this.name = data.name;
          this.description = data.description || '';
          this.active = data.active ?? true;
        });
      }
    });
  }

  save(): void {
    const pm: PaymentMethod = {
      idPaymentMethod: this.id,
      name: this.name,
      description: this.description,
      active: this.active
    };

    if (this.isEdit) {
      this.paymentMethodService.update(this.id, pm).subscribe(() => this.router.navigate(['/pages/payment-method']));
    } else {
      this.paymentMethodService.save(pm).subscribe(() => this.router.navigate(['/pages/payment-method']));
    }
  }
}
