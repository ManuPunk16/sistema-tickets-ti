import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { AdminGuard } from '../../core/guards/admin.guard';

export const AUTH_ROUTES: Routes = [
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    canActivate: [AdminGuard]  // Asegura que solo administradores accedan
  },
  { 
    path: 'forgot-password', 
    component: ForgotPasswordComponent 
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
