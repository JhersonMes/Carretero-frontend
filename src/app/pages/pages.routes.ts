import { Routes } from '@angular/router';

export const pagesRoutes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'role',
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
    loadComponent: () => import('./product/product.component').then((m) => m.ProductComponent),
  },
  {
    path: 'catalog',
    loadComponent: () => import('./catalog/catalog.component').then((m) => m.CatalogComponent),
  },
  {
    path: 'client',
    loadComponent: () => import('./client/client.component').then((m) => m.ClientComponent),
  },
  {
    path: 'ingredient',
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
    loadComponent: () => import('./salon/salon.component').then((m) => m.SalonComponent),
  },
  {
    path: 'table-layout',
    loadComponent: () =>
      import('./table-layout/table-layout.component').then((m) => m.TableLayoutComponent),
  },
  {
    path: 'salon/:id',
    loadComponent: () =>
      import('./salon/table-order/table-order.component').then((m) => m.TableOrderComponent),
  },
  {
    path: 'quick-sale',
    loadComponent: () =>
      import('./quick-sale/quick-sale.component').then((m) => m.QuickSaleComponent),
  },
  {
    path: 'cash-shift',
    loadComponent: () =>
      import('./cash-shift/cash-shift.component').then((m) => m.CashShiftComponent),
  },
  {
    path: 'kitchen',
    loadComponent: () => import('./kitchen/kitchen.component').then((m) => m.KitchenComponent),
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
