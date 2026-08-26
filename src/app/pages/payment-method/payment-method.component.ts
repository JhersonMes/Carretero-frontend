import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { PaymentMethodService } from '../../services/payment-method.service';
import { PaymentMethod } from '../../model/payment-method';

@Component({
  selector: 'app-payment-method',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './payment-method.component.html'
})
export class PaymentMethodComponent implements OnInit {
  private paymentMethodService = inject(PaymentMethodService);
  methods: PaymentMethod[] = [];

  ngOnInit(): void {
    this.loadMethods();
  }

  loadMethods(): void {
    this.paymentMethodService.findAll().subscribe((data) => {
      this.methods = data;
    });
  }

  deleteMethod(id: number): void {
    if (confirm('¿Está seguro de eliminar este método de pago?')) {
      this.paymentMethodService.delete(id).subscribe(() => this.loadMethods());
    }
  }
}
