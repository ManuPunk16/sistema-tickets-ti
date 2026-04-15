import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { adminGuard } from './core/guards/admin.guard';
import { AuthorizedUserGuard } from './core/guards/authorized-user.guard';
import { redirectUnauthorizedTo } from '@angular/fire/auth-guard';

const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['auth/login']);

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthorizedUserGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/dashboard/pages/dashboard/dashboard.component')
          .then(c => c.DashboardComponent)
      },
      {
        path: 'tickets',
        loadChildren: () => import('./modules/tickets/tickets.routes').then(mod => mod.TICKETS_ROUTES)
      },
      {
        path: 'usuarios',
        loadChildren: () => import('./modules/usuarios/usuarios.routes').then(mod => mod.USUARIOS_ROUTES),
        canActivate: [adminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'departamentos',
        loadChildren: () => import('./modules/departamentos/departamentos.routes')
          .then(mod => mod.DEPARTAMENTOS_ROUTES),
        canActivate: [adminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'reportes',
        loadChildren: () => import('./modules/reportes/reportes.routes').then(mod => mod.REPORTES_ROUTES),
        canActivate: [adminGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./modules/configuracion/pages/system-settings/system-settings.component')
          .then(c => c.SystemSettingsComponent),
        canActivate: [adminGuard],
        data: { roles: ['admin'] }
      },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    ]
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.routes').then(mod => mod.AUTH_ROUTES)
  },
  { path: '**', redirectTo: '/dashboard' }
];
