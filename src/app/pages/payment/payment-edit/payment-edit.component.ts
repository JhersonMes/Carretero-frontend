import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { PaymentMethodService } from '../../../services/payment-method.service';
import { AuthService } from '../../../services/auth.service';
import { Payment } from '../../../model/payment';
import { PaymentMethod } from '../../../model/payment-method';

@Component({
  selector: 'app-payment-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './payment-edit.component.html'
})
export class PaymentEditComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private paymentMethodService = inject(PaymentMethodService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  id: number = 0;
  isEdit: boolean = false;
  amount: number = 0;
  rucClient: string = '';
  clientName: string = '';
  details: string = '';
  idPaymentMethod: number = 0;
  paymentMethods: PaymentMethod[] = [];

  ngOnInit(): void {
    this.paymentMethodService.findAll().subscribe((pm) => (this.paymentMethods = pm));

    this.route.params.subscribe((params) => {
      this.id = params['id'];
      this.isEdit = !!this.id;
      if (this.isEdit) {
        this.paymentService.findById(this.id).subscribe((data) => {
          this.amount = data.amount;
          this.rucClient = data.rucClient || '';
          this.clientName = data.clientName || '';
          this.details = data.details || '';
          this.idPaymentMethod = data.paymentMethod?.idPaymentMethod || 0;
        });
      }
    });
  }

  save(): void {
    const selectedPM = this.paymentMethods.find((pm) => pm.idPaymentMethod === Number(this.idPaymentMethod));
    const currentUser = this.authService.currentUser();

    const payment: Payment = {
      idPayment: this.id,
      amount: this.amount,
      paymentDate: new Date().toISOString(),
      rucClient: this.rucClient,
      clientName: this.clientName,
      details: this.details,
      pdfUrl: '',
      user: currentUser!,
      paymentMethod: selectedPM!
    };

    if (this.isEdit) {
      this.paymentService.update(this.id, payment).subscribe(() => this.router.navigate(['/pages/payment']));
    } else {
      this.paymentService.save(payment).subscribe(() => this.router.navigate(['/pages/payment']));
    }
  }
}
