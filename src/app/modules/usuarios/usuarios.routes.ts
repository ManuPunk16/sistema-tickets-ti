import { Routes } from '@angular/router';
import { UserListComponent } from './pages/user-list/user-list.component';
import { UserFormComponent } from './pages/user-form/user-form.component';
import { UserDetailComponent } from './pages/user-detail/user-detail.component';

export const USUARIOS_ROUTES: Routes = [
  { path: '', component: UserListComponent },
  { path: 'nuevo', component: UserFormComponent },
  { path: 'editar/:id', component: UserFormComponent },
  { path: ':id', component: UserDetailComponent },
];
