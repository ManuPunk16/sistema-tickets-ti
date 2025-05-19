import { Routes } from '@angular/router';
import { AuthGuard, redirectUnauthorizedTo } from '@angular/fire/auth-guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['auth/login']);

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/dashboard/pages/dashboard/dashboard.component')
          .then(c => c.DashboardComponent),
        canActivate: [AuthGuard],
        data: { authGuardPipe: redirectUnauthorizedToLogin }
      },
      {
        path: 'tickets',
        loadChildren: () => import('./modules/tickets/tickets.routes').then(mod => mod.TICKETS_ROUTES),
        canActivate: [AuthGuard],
        data: { authGuardPipe: redirectUnauthorizedToLogin }
      },
      {
        path: 'usuarios',
        loadChildren: () => import('./modules/usuarios/usuarios.routes').then(mod => mod.USUARIOS_ROUTES),
        canActivate: [AuthGuard],
        data: { authGuardPipe: redirectUnauthorizedToLogin, roles: ['admin'] }
      },
      {
        path: 'departamentos',
        loadChildren: () => import('./modules/departamentos/departamentos.routes')
          .then(mod => mod.DEPARTAMENTOS_ROUTES),
        canActivate: [AuthGuard],
        data: { authGuardPipe: redirectUnauthorizedToLogin, roles: ['admin'] }
      },
      {
        path: 'reportes',
        loadChildren: () => import('./modules/reportes/reportes.routes').then(mod => mod.REPORTES_ROUTES),
        canActivate: [AuthGuard],
        data: { authGuardPipe: redirectUnauthorizedToLogin }
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./modules/configuracion/pages/system-settings/system-settings.component')
          .then(c => c.SystemSettingsComponent),
        canActivate: [AuthGuard],
        data: { authGuardPipe: redirectUnauthorizedToLogin, roles: ['admin'] }
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
