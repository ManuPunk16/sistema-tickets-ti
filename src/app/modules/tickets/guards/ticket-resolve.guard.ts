import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, Router } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Ticket } from '../../../core/models/ticket.model';
import { TicketService } from '../../../core/services/ticket.service';
import { NotificacionService } from '../../../core/services/notificacion.service';

@Injectable({
  providedIn: 'root'
})
export class TicketResolveGuard implements Resolve<Ticket | null> {
  constructor(
    private ticketService: TicketService,
    private router: Router,
    private notificaciones: NotificacionService,
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Ticket | null> {
    const id = route.paramMap.get('id');

    if (!id) {
      this.router.navigate(['/tickets']);
      return EMPTY;
    }

    return this.ticketService.obtenerTicketPorId(id).pipe(
      map(ticket => {
        if (ticket) return ticket;
        this.notificaciones.error('Ticket no encontrado');
        this.router.navigate(['/tickets']);
        return null;
      }),
      catchError(() => {
        // No redirigir al dashboard en caso de error — dejar que el componente maneje el fallback
        return EMPTY;
      })
    );
  }
}
