import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    RouterLink
  ],
  template: `
    <div class="p-4 md:p-6">
      <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

      <div *ngIf="currentUser$ | async as user" class="mb-8">
        <h2 class="text-lg font-semibold mb-4">Bienvenido, {{ user.displayName || user.email }}</h2>

        <!-- Resumen rápido -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Tickets sin asignar (solo para admin/support) -->
          <mat-card *ngIf="user.role === 'admin' || user.role === 'support'" class="bg-blue-50">
            <mat-card-content>
              <div class="flex items-center">
                <mat-icon class="text-blue-500 text-3xl mr-4">assignment_late</mat-icon>
                <div>
                  <h3 class="text-sm font-medium text-gray-500">Sin asignar</h3>
                  <p class="text-2xl font-semibold">{{ unassignedTicketsCount || 0 }}</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Tickets abiertos -->
          <mat-card class="bg-yellow-50">
            <mat-card-content>
              <div class="flex items-center">
                <mat-icon class="text-yellow-500 text-3xl mr-4">pending_actions</mat-icon>
                <div>
                  <h3 class="text-sm font-medium text-gray-500">En proceso</h3>
                  <p class="text-2xl font-semibold">{{ inProgressTicketsCount || 0 }}</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Tickets completados -->
          <mat-card class="bg-green-50">
            <mat-card-content>
              <div class="flex items-center">
                <mat-icon class="text-green-500 text-3xl mr-4">check_circle</mat-icon>
                <div>
                  <h3 class="text-sm font-medium text-gray-500">Resueltos</h3>
                  <p class="text-2xl font-semibold">{{ resolvedTicketsCount || 0 }}</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Total de tickets -->
          <mat-card class="bg-purple-50">
            <mat-card-content>
              <div class="flex items-center">
                <mat-icon class="text-purple-500 text-3xl mr-4">confirmation_number</mat-icon>
                <div>
                  <h3 class="text-sm font-medium text-gray-500">Total tickets</h3>
                  <p class="text-2xl font-semibold">{{ totalTicketsCount || 0 }}</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Acciones rápidas -->
      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-4">Acciones rápidas</h2>

        <div class="flex flex-wrap gap-4">
          <a [routerLink]="['/tickets/nuevo']" mat-raised-button color="primary">
            <mat-icon class="mr-2">add</mat-icon>
            Nuevo ticket
          </a>

          <a [routerLink]="['/tickets']" mat-stroked-button color="primary">
            <mat-icon class="mr-2">list</mat-icon>
            Ver todos los tickets
          </a>

          <a [routerLink]="['/reportes']" mat-stroked-button color="accent">
            <mat-icon class="mr-2">analytics</mat-icon>
            Reportes
          </a>
        </div>
      </div>

      <!-- Progreso de tickets por estado -->
      <div class="mb-8">
        <h2 class="text-lg font-semibold mb-4">Estado de tickets</h2>

        <mat-card class="p-4">
          <div class="mb-4">
            <div class="flex justify-between mb-1">
              <span class="text-sm font-medium">Nuevos</span>
              <span class="text-sm font-medium">{{ newTicketsPercent }}%</span>
            </div>
            <mat-progress-bar [value]="newTicketsPercent" color="primary"></mat-progress-bar>
          </div>

          <div class="mb-4">
            <div class="flex justify-between mb-1">
              <span class="text-sm font-medium">Asignados</span>
              <span class="text-sm font-medium">{{ assignedTicketsPercent }}%</span>
            </div>
            <mat-progress-bar [value]="assignedTicketsPercent" color="accent"></mat-progress-bar>
          </div>

          <div class="mb-4">
            <div class="flex justify-between mb-1">
              <span class="text-sm font-medium">En proceso</span>
              <span class="text-sm font-medium">{{ inProgressTicketsPercent }}%</span>
            </div>
            <mat-progress-bar [value]="inProgressTicketsPercent" color="warn"></mat-progress-bar>
          </div>

          <div class="mb-4">
            <div class="flex justify-between mb-1">
              <span class="text-sm font-medium">En espera</span>
              <span class="text-sm font-medium">{{ waitingTicketsPercent }}%</span>
            </div>
            <mat-progress-bar [value]="waitingTicketsPercent" color="warn"></mat-progress-bar>
          </div>

          <div class="mb-4">
            <div class="flex justify-between mb-1">
              <span class="text-sm font-medium">Resueltos</span>
              <span class="text-sm font-medium">{{ resolvedTicketsPercent }}%</span>
            </div>
            <mat-progress-bar [value]="resolvedTicketsPercent" color="primary"></mat-progress-bar>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    mat-card {
      height: 100%;
    }
  `]
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
