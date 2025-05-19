import { Routes } from '@angular/router';
import { TicketListComponent } from './pages/ticket-list/ticket-list.component';
import { TicketDetailComponent } from './pages/ticket-detail/ticket-detail.component';
import { TicketFormComponent } from './pages/ticket-form/ticket-form.component';
import { TicketResolveGuard } from './guards/ticket-resolve.guard';

export const TICKETS_ROUTES: Routes = [
  {
    path: '',
    component: TicketListComponent
  },
  {
    path: 'nuevo',
    component: TicketFormComponent
  },
  {
    path: 'editar/:id',
    component: TicketFormComponent,
    resolve: {
      ticket: TicketResolveGuard
    }
  },
  {
    path: ':id',
    component: TicketDetailComponent,
    resolve: {
      ticket: TicketResolveGuard
    }
  }
];
