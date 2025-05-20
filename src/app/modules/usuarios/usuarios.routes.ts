import { Routes } from '@angular/router';
import { UserListComponent } from './pages/user-list/user-list.component';
import { UserDetailComponent } from './pages/user-detail/user-detail.component';
import { UserFormComponent } from './pages/user-form/user-form.component';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

export const USUARIOS_ROUTES: Routes = [
  { path: '', component: UserListComponent },
  { 
    // Redirección de la ruta anterior a /auth/register
    path: 'nuevo',
    redirectTo: '/auth/register',
    pathMatch: 'full'
  },
  { path: 'editar/:id', component: UserFormComponent },
  { path: ':id', component: UserDetailComponent },
];
