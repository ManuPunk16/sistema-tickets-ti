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
  template: `
    <div class="p-4 md:p-6">
      <div class="flex items-center mb-6">
        <button mat-icon-button [routerLink]="['/usuarios']" matTooltip="Volver">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="text-2xl font-bold ml-2">Detalles de Usuario</h1>
      </div>

      <div *ngIf="loading" class="flex justify-center my-8">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <ng-container *ngIf="!loading && user">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Información Principal -->
          <div class="lg:col-span-2">
            <mat-card>
              <mat-card-header>
                <div *ngIf="user.photoURL" class="mr-4">
                  <img [src]="user.photoURL" alt="Foto de perfil" class="rounded-full w-16 h-16">
                </div>
                <div *ngIf="!user.photoURL" class="mr-4 w-16 h-16 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-2xl">
                  {{ user.displayName?.charAt(0) || user.email?.charAt(0) || 'U' }}
                </div>
                <mat-card-title>{{ user.displayName || 'Sin nombre' }}</mat-card-title>
                <mat-card-subtitle>{{ user.email }}</mat-card-subtitle>
              </mat-card-header>

              <mat-card-content class="p-4">
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <p class="text-gray-500 mb-1">Rol</p>
                    <p>
                      <mat-chip [ngClass]="{
                        'bg-indigo-100 text-indigo-800': user.role === 'admin',
                        'bg-green-100 text-green-800': user.role === 'support',
                        'bg-gray-100 text-gray-800': user.role === 'user'
                      }">
                        {{ formatRole(user.role) }}
                      </mat-chip>
                    </p>
                  </div>

                  <div>
                    <p class="text-gray-500 mb-1">Departamento</p>
                    <p class="font-medium">{{ user.department || 'No asignado' }}</p>
                  </div>

                  <div>
                    <p class="text-gray-500 mb-1">Cargo</p>
                    <p class="font-medium">{{ user.position || 'No especificado' }}</p>
                  </div>

                  <div>
                    <p class="text-gray-500 mb-1">Creado</p>
                    <p class="font-medium">{{ formatDate(user.createdAt) }}</p>
                  </div>

                  <div>
                    <p class="text-gray-500 mb-1">Última actualización</p>
                    <p class="font-medium">{{ formatDate(user.updatedAt) }}</p>
                  </div>
                </div>
              </mat-card-content>

              <mat-card-actions *ngIf="(currentUser$ | async)?.role === 'admin'">
                <div class="flex justify-end p-2">
                  <button mat-stroked-button color="primary" [routerLink]="['/usuarios/editar', user.uid]">
                    <mat-icon class="mr-1">edit</mat-icon>
                    Editar
                  </button>
                </div>
              </mat-card-actions>
            </mat-card>

            <!-- Tickets y Actividad -->
            <mat-card class="mt-6">
              <mat-card-content>
                <mat-tab-group animationDuration="0ms">
                  <mat-tab label="Tickets Creados">
                    <div class="p-3">
                      <div *ngIf="loadingTickets" class="flex justify-center py-8">
                        <mat-spinner diameter="30"></mat-spinner>
                      </div>

                      <div *ngIf="!loadingTickets && userTickets.length === 0" class="text-center py-8">
                        <mat-icon class="text-gray-400 text-5xl">assignment</mat-icon>
                        <p class="mt-2 text-gray-500">Este usuario no ha creado tickets</p>
                      </div>

                      <div *ngIf="!loadingTickets && userTickets.length > 0" class="space-y-4">
                        <div *ngFor="let ticket of userTickets"
                            class="border rounded-md p-4 hover:bg-gray-50 cursor-pointer"
                            [routerLink]="['/tickets', ticket.id]">
                          <div class="flex justify-between">
                            <h4 class="font-medium">{{ ticket.title }}</h4>
                            <span class="text-sm px-2 py-1 rounded-full"
                                [ngClass]="getStatusClass(ticket.status)">
                              {{ ticket.status }}
                            </span>
                          </div>
                          <p class="text-sm text-gray-600 mt-1 truncate">{{ ticket.description }}</p>
                          <div class="flex justify-between mt-2 text-xs text-gray-500">
                            <span>{{ formatDate(ticket.createdAt) }}</span>
                            <span>{{ ticket.department }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </mat-tab>

                  <mat-tab label="Tickets Asignados" *ngIf="user.role === 'support'">
                    <div class="p-3">
                      <div *ngIf="loadingAssignedTickets" class="flex justify-center py-8">
                        <mat-spinner diameter="30"></mat-spinner>
                      </div>

                      <div *ngIf="!loadingAssignedTickets && assignedTickets.length === 0" class="text-center py-8">
                        <mat-icon class="text-gray-400 text-5xl">support_agent</mat-icon>
                        <p class="mt-2 text-gray-500">No hay tickets asignados a este usuario</p>
                      </div>

                      <div *ngIf="!loadingAssignedTickets && assignedTickets.length > 0" class="space-y-4">
                        <div *ngFor="let ticket of assignedTickets"
                            class="border rounded-md p-4 hover:bg-gray-50 cursor-pointer"
                            [routerLink]="['/tickets', ticket.id]">
                          <div class="flex justify-between">
                            <h4 class="font-medium">{{ ticket.title }}</h4>
                            <span class="text-sm px-2 py-1 rounded-full"
                                [ngClass]="getStatusClass(ticket.status)">
                              {{ ticket.status }}
                            </span>
                          </div>
                          <p class="text-sm text-gray-600 mt-1 truncate">{{ ticket.description }}</p>
                          <div class="flex justify-between mt-2 text-xs text-gray-500">
                            <span>{{ formatDate(ticket.createdAt) }}</span>
                            <span>{{ ticket.department }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </mat-tab>
                </mat-tab-group>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Panel Lateral -->
          <div class="lg:col-span-1">
            <mat-card>
              <mat-card-header>
                <mat-card-title>
                  <h3 class="text-lg font-medium">Estadísticas</h3>
                </mat-card-title>
              </mat-card-header>

              <mat-card-content class="p-4">
                <div class="space-y-4">
                  <div>
                    <p class="text-gray-500 mb-1">Tickets creados</p>
                    <p class="font-medium text-xl">{{ userTickets.length }}</p>
                  </div>

                  <mat-divider></mat-divider>

                  <div *ngIf="user.role === 'support'">
                    <p class="text-gray-500 mb-1">Tickets asignados</p>
                    <p class="font-medium text-xl">{{ assignedTickets.length }}</p>
                  </div>

                  <div *ngIf="user.role === 'support'">
                    <p class="text-gray-500 mb-1">Tickets resueltos</p>
                    <p class="font-medium text-xl">{{ resolvedTicketsCount }}</p>
                  </div>

                  <mat-divider *ngIf="user.role === 'support'"></mat-divider>

                  <div *ngIf="user.role === 'support'">
                    <p class="text-gray-500 mb-1">Tiempo promedio de resolución</p>
                    <p class="font-medium text-xl">{{ avgResolutionTime || 'N/A' }}</p>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      </ng-container>

      <div *ngIf="!loading && !user" class="text-center py-8">
        <mat-icon class="text-gray-400 text-7xl">error_outline</mat-icon>
        <p class="text-xl font-medium mt-4">No se pudo encontrar el usuario</p>
        <p class="text-gray-500 mt-2">El usuario solicitado no existe o ha sido eliminado</p>
        <button mat-raised-button color="primary" class="mt-4" [routerLink]="['/usuarios']">
          Ver todos los usuarios
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
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
