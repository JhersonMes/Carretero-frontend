import { Routes } from '@angular/router';
import { cashierOnlyGuard } from '../guards/cashier-only.guard';
import { ADMIN, SALON_ROLES, STATION_ROLES, roleGuard } from '../guards/role.guard';

export const pagesRoutes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'dashboard',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'role',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () => import('./role/role.component').then((m) => m.RoleComponent),
    children: [
      {
        path: 'new',
        loadComponent: () =>
          import('./role/role-edit/role-edit.component').then((m) => m.RoleEditComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./role/role-edit/role-edit.component').then((m) => m.RoleEditComponent),
      },
    ],
  },
  {
    path: 'user',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () => import('./user/user.component').then((m) => m.UserComponent),
    children: [
      {
        path: 'new',
        loadComponent: () =>
          import('./user/user-edit/user-edit.component').then((m) => m.UserEditComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./user/user-edit/user-edit.component').then((m) => m.UserEditComponent),
      },
    ],
  },
  {
    path: 'product',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () => import('./product/product.component').then((m) => m.ProductComponent),
  },
  {
    path: 'catalog',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () => import('./catalog/catalog.component').then((m) => m.CatalogComponent),
  },
  {
    path: 'client',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () => import('./client/client.component').then((m) => m.ClientComponent),
  },
  {
    path: 'ingredient',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () =>
      import('./ingredient/ingredient.component').then((m) => m.IngredientComponent),
    children: [
      {
        path: 'new',
        loadComponent: () =>
          import('./ingredient/ingredient-edit/ingredient-edit.component').then(
            (m) => m.IngredientEditComponent
          ),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./ingredient/ingredient-edit/ingredient-edit.component').then(
            (m) => m.IngredientEditComponent
          ),
      },
    ],
  },
  {
    path: 'menu',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () => import('./menu/menu.component').then((m) => m.MenuComponent),
    children: [
      {
        path: 'new',
        loadComponent: () =>
          import('./menu/menu-edit/menu-edit.component').then((m) => m.MenuEditComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./menu/menu-edit/menu-edit.component').then((m) => m.MenuEditComponent),
      },
    ],
  },
  {
    path: 'payment-method',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () =>
      import('./payment-method/payment-method.component').then(
        (m) => m.PaymentMethodComponent
      ),
    children: [
      {
        path: 'new',
        loadComponent: () =>
          import('./payment-method/payment-method-edit/payment-method-edit.component').then(
            (m) => m.PaymentMethodEditComponent
          ),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./payment-method/payment-method-edit/payment-method-edit.component').then(
            (m) => m.PaymentMethodEditComponent
          ),
      },
    ],
  },
  {
    path: 'payment',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () =>
      import('./payment/payment.component').then((m) => m.PaymentComponent),
    children: [
      {
        path: 'new',
        loadComponent: () =>
          import('./payment/payment-edit/payment-edit.component').then(
            (m) => m.PaymentEditComponent
          ),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./payment/payment-edit/payment-edit.component').then(
            (m) => m.PaymentEditComponent
          ),
      },
    ],
  },
  {
    path: 'salon',
    canActivate: [roleGuard(SALON_ROLES)],
    loadComponent: () => import('./salon/salon.component').then((m) => m.SalonComponent),
  },
  {
    path: 'table-layout',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () =>
      import('./table-layout/table-layout.component').then((m) => m.TableLayoutComponent),
  },
  {
    path: 'salon/:id',
    canActivate: [roleGuard(SALON_ROLES)],
    loadComponent: () =>
      import('./salon/table-order/table-order.component').then((m) => m.TableOrderComponent),
  },
  {
    path: 'quick-sale',
    canActivate: [roleGuard(SALON_ROLES)],
    loadComponent: () =>
      import('./quick-sale/quick-sale.component').then((m) => m.QuickSaleComponent),
  },
  {
    path: 'delivery',
    canActivate: [cashierOnlyGuard],
    loadComponent: () =>
      import('./delivery/delivery.component').then((m) => m.DeliveryComponent),
  },
  {
    path: 'cash-shift',
    canActivate: [roleGuard(SALON_ROLES)],
    loadComponent: () =>
      import('./cash-shift/cash-shift.component').then((m) => m.CashShiftComponent),
  },
  {
    path: 'kitchen',
    canActivate: [roleGuard(STATION_ROLES)],
    loadComponent: () => import('./kitchen/kitchen.component').then((m) => m.KitchenComponent),
  },
  {
    path: 'printers',
    canActivate: [roleGuard(ADMIN)],
    loadComponent: () => import('./printers/printers.component').then((m) => m.PrintersComponent),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent
      ),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
