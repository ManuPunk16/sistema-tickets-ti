import { Routes } from '@angular/router';

export const AUDITORIA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/auditoria-log/auditoria-log.component').then(
        c => c.AuditoriaLogComponent
      ),
  },
];
