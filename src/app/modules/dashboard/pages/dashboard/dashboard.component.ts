import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { ReportService } from '../../../../core/services/report.service';
import { TicketService } from '../../../../core/services/ticket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfile } from '../../../../core/models/user.model';
import { TicketMetric } from '../../../../core/models/report.model';
import { TicketStatus } from '../../../../core/models/ticket.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser$!: Observable<UserProfile | null>;

  // Contadores de tickets
  unassignedTicketsCount = 0;
  inProgressTicketsCount = 0;
  resolvedTicketsCount = 0;
  totalTicketsCount = 0;

  // Porcentajes para barras de progreso
  newTicketsPercent = 0;
  assignedTicketsPercent = 0;
  inProgressTicketsPercent = 0;
  waitingTicketsPercent = 0;
  resolvedTicketsPercent = 0;

  constructor(
    private authService: AuthService,
    private ticketService: TicketService,
    private reportService: ReportService
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.getCurrentUser();
    this.loadTicketMetrics();
  }

  private loadTicketMetrics(): void {
    this.reportService.getTicketMetrics().subscribe((metrics: TicketMetric) => {
      this.totalTicketsCount = metrics.totalTickets;

      // Contar por estado
      const ticketsByStatus = metrics.ticketsByStatus;

      this.unassignedTicketsCount = ticketsByStatus['nuevo'] || 0;
      this.inProgressTicketsCount = (ticketsByStatus['en_proceso'] || 0) + (ticketsByStatus['asignado'] || 0);
      this.resolvedTicketsCount = (ticketsByStatus['resuelto'] || 0) + (ticketsByStatus['cerrado'] || 0);

      // Calcular porcentajes
      if (this.totalTicketsCount > 0) {
        this.newTicketsPercent = Math.round((ticketsByStatus['nuevo'] || 0) * 100 / this.totalTicketsCount);
        this.assignedTicketsPercent = Math.round((ticketsByStatus['asignado'] || 0) * 100 / this.totalTicketsCount);
        this.inProgressTicketsPercent = Math.round((ticketsByStatus['en_proceso'] || 0) * 100 / this.totalTicketsCount);
        this.waitingTicketsPercent = Math.round((ticketsByStatus['en_espera'] || 0) * 100 / this.totalTicketsCount);
        this.resolvedTicketsPercent = Math.round(((ticketsByStatus['resuelto'] || 0) + (ticketsByStatus['cerrado'] || 0)) * 100 / this.totalTicketsCount);
      }
    });
  }
}
