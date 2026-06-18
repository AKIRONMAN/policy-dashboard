import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/container/dashboard-container/dashboard-container.component').then(
        (m) => m.DashboardContainerComponent
      ),
  },
];
