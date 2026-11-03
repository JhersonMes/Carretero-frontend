import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './login/register/register.component';
import { ResetPasswordComponent } from './login/reset-password/reset-password.component';
import { LayoutComponent } from './pages/layout/layout.component';
import { adminOnlyGuard } from './guards/admin-only.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  {
    path: 'pages',
    component: LayoutComponent,
    canActivate: [adminOnlyGuard],
    loadChildren: () => import('./pages/pages.routes').then((m) => m.pagesRoutes),
  },
  { path: '**', redirectTo: 'login' }
];
