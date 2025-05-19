import { Routes } from '@angular/router';
import { DepartmentListComponent } from './pages/department-list/department-list.component';
import { DepartmentFormComponent } from './pages/department-form/department-form.component';

export const DEPARTAMENTOS_ROUTES: Routes = [
  { path: '', component: DepartmentListComponent },
  { path: 'nuevo', component: DepartmentFormComponent },
  { path: 'editar/:id', component: DepartmentFormComponent },
];
