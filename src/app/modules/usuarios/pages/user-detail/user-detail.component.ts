import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { UserService } from '../../../../core/services/user.service';
import { TicketService } from '../../../../core/services/ticket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfile } from '../../../../core/models/user.model';
import { Ticket } from '../../../../core/models/ticket.model';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit {
  user: UserProfile | null = null;
  currentUser$: Observable<UserProfile | null>;
  loading = true;
  loadingTickets = true;
  loadingAssignedTickets = false;
  userTickets: Ticket[] = [];
  assignedTickets: Ticket[] = [];
  resolvedTicketsCount = 0;
  avgResolutionTime: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private ticketService: TicketService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.currentUser$ = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const userId = params['id'];
      if (!userId) {
        this.router.navigate(['/usuarios']);
        return;
      }

      this.userService.getUserById(userId).pipe(
        catchError(error => {
          this.snackBar.open(`Error al cargar usuario: ${error.message}`, 'Cerrar', { duration: 3000 });
          this.loading = false;
          return of(null);
        }),
        switchMap(user => {
          this.user = user;
          this.loading = false;

          if (!user) return of(null);

          // Cargar tickets creados por el usuario
          this.loadingTickets = true;
          return forkJoin({
            createdTickets: this.ticketService.getUserTickets(user.uid),
            assignedTickets: user.role === 'support'
              ? this.ticketService.getAssignedTickets(user.uid)
              : of([])
          });
        })
      ).subscribe(result => {
        if (!result) return;

        this.userTickets = result.createdTickets;
        this.assignedTickets = result.assignedTickets;
        this.loadingTickets = false;

        if (this.user?.role === 'support') {
          // Calcular métricas para agentes de soporte
          this.resolvedTicketsCount = this.assignedTickets.filter(
            t => t.status === 'resuelto' || t.status === 'cerrado'
          ).length;

          this.calculateAverageResolutionTime();
        }
      });
    });
  }

  calculateAverageResolutionTime(): void {
    const resolvedTickets = this.assignedTickets.filter(
      t => t.status === 'resuelto' || t.status === 'cerrado'
    );

    if (resolvedTickets.length === 0) {
      this.avgResolutionTime = 'N/A';
      return;
    }

    let totalMinutes = 0;
    let ticketsWithTime = 0;

    resolvedTickets.forEach(ticket => {
      if (ticket.resolvedAt && ticket.createdAt && ticket.actualTime) {
        totalMinutes += ticket.actualTime;
        ticketsWithTime++;
      }
    });

    if (ticketsWithTime === 0) {
      this.avgResolutionTime = 'N/A';
      return;
    }

    const avgMinutes = Math.round(totalMinutes / ticketsWithTime);

    if (avgMinutes < 60) {
      this.avgResolutionTime = `${avgMinutes} min`;
    } else if (avgMinutes < 1440) {
      const hours = Math.floor(avgMinutes / 60);
      const mins = avgMinutes % 60;
      this.avgResolutionTime = `${hours}h ${mins}m`;
    } else {
      const days = Math.floor(avgMinutes / 1440);
      const remainingMins = avgMinutes % 1440;
      const hours = Math.floor(remainingMins / 60);
      const mins = remainingMins % 60;
      this.avgResolutionTime = `${days}d ${hours}h ${mins}m`;
    }
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'nuevo': return 'bg-blue-100 text-blue-800';
      case 'asignado': return 'bg-purple-100 text-purple-800';
      case 'en_proceso': return 'bg-yellow-100 text-yellow-800';
      case 'en_espera': return 'bg-orange-100 text-orange-800';
      case 'resuelto': return 'bg-green-100 text-green-800';
      case 'cerrado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatRole(role: string): string {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'support': return 'Soporte';
      case 'user': return 'Usuario';
      default: return role;
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }
}
