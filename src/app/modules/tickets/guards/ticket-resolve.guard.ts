import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Ticket } from '../../../core/models/ticket.model';
import { TicketService } from '../../../core/services/ticket.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class TicketResolveGuard implements Resolve<Ticket | null> {
  constructor(
    private ticketService: TicketService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Ticket | null> {
    const id = route.paramMap.get('id');

    if (!id) {
      this.router.navigate(['/tickets']);
      return of(null);
    }

    return this.ticketService.getTicketById(id).pipe(
      map(ticket => {
        if (ticket) {
          return ticket;
        } else {
          this.snackBar.open('Ticket no encontrado', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/tickets']);
          return null;
        }
      }),
      catchError(err => {
        this.snackBar.open(`Error al cargar ticket: ${err.message}`, 'Cerrar', { duration: 3000 });
        this.router.navigate(['/tickets']);
        return EMPTY;
      })
    );
  }
}
