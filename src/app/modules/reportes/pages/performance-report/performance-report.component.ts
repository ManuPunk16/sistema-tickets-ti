import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';

import { ReportService } from '../../../../core/services/report.service';
import { UserService } from '../../../../core/services/user.service';
import { UserProfile } from '../../../../core/models/user.model';

@Component({
  selector: 'app-performance-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTabsModule
  ],
  template: `
    <div class="p-4 md:p-6">
      <div class="flex items-center mb-6">
        <button mat-icon-button [routerLink]="['/reportes']" matTooltip="Volver">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="text-2xl font-bold ml-2">Reporte de Rendimiento</h1>
      </div>

      <!-- Filtros -->
      <mat-card class="mb-6">
        <mat-card-content>
          <form [formGroup]="filterForm" class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Fecha de inicio</mat-label>
              <input matInput [matDatepicker]="startPicker" formControlName="startDate">
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Fecha de fin</mat-label>
              <input matInput [matDatepicker]="endPicker" formControlName="endDate">
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Agente de soporte</mat-label>
              <mat-select formControlName="supportAgent">
                <mat-option [value]="''">Todos</mat-option>
                <mat-option *ngFor="let user of supportUsers" [value]="user.uid">
                  {{ user.displayName || user.email }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <div class="flex items-end">
              <button mat-raised-button color="primary" (click)="generateReport()">
                <mat-icon class="mr-1">analytics</mat-icon>
                Generar Reporte
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Cargando -->
      <div *ngIf="loading" class="flex justify-center my-8">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- Contenido del Reporte -->
      <div *ngIf="!loading && hasData">
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <mat-card>
            <mat-card-content class="p-4">
              <div class="text-center">
                <h2 class="text-gray-500 text-lg">Tickets Resueltos</h2>
                <p class="text-4xl font-bold">{{ performanceData.resolvedTickets }}</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content class="p-4">
              <div class="text-center">
                <h2 class="text-gray-500 text-lg">Tiempo Promedio de Resolución</h2>
                <p class="text-4xl font-bold">{{ formatTime(performanceData.avgResolutionTime) }}</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content class="p-4">
              <div class="text-center">
                <h2 class="text-gray-500 text-lg">Satisfacción del Cliente</h2>
                <p class="text-4xl font-bold">{{ performanceData.customerSatisfaction }}%</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Tablas de Rendimiento -->
        <mat-card>
          <mat-card-content>
            <mat-tab-group>
              <mat-tab label="Tiempo de Resolución">
                <div class="p-4">
                  <table mat-table [dataSource]="performanceData.resolutionTimes" class="w-full">
                    <ng-container matColumnDef="ticketId">
                      <th mat-header-cell *matHeaderCellDef>ID Ticket</th>
                      <td mat-cell *matCellDef="let item">{{ item.ticketId }}</td>
                    </ng-container>

                    <ng-container matColumnDef="title">
                      <th mat-header-cell *matHeaderCellDef>Título</th>
                      <td mat-cell *matCellDef="let item">{{ item.title }}</td>
                    </ng-container>

                    <ng-container matColumnDef="priority">
                      <th mat-header-cell *matHeaderCellDef>Prioridad</th>
                      <td mat-cell *matCellDef="let item">{{ item.priority }}</td>
                    </ng-container>

                    <ng-container matColumnDef="resolutionTime">
                      <th mat-header-cell *matHeaderCellDef>Tiempo de Resolución</th>
                      <td mat-cell *matCellDef="let item">{{ formatTime(item.resolutionTime) }}</td>
                    </ng-container>

                    <ng-container matColumnDef="slaStatus">
                      <th mat-header-cell *matHeaderCellDef>Estado SLA</th>
                      <td mat-cell *matCellDef="let item">
                        <span [class]="item.slaCompliance ? 'text-green-600' : 'text-red-600'">
                          {{ item.slaCompliance ? 'Cumplido' : 'Excedido' }}
                        </span>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="['ticketId', 'title', 'priority', 'resolutionTime', 'slaStatus']"></tr>
                    <tr mat-row *matRowDef="let row; columns: ['ticketId', 'title', 'priority', 'resolutionTime', 'slaStatus'];"></tr>
                  </table>
                </div>
              </mat-tab>

              <mat-tab label="Productividad">
                <div class="p-4">
                  <table mat-table [dataSource]="performanceData.productivityData" class="w-full">
                    <ng-container matColumnDef="day">
                      <th mat-header-cell *matHeaderCellDef>Día</th>
                      <td mat-cell *matCellDef="let item">{{ item.day }}</td>
                    </ng-container>

                    <ng-container matColumnDef="ticketsAssigned">
                      <th mat-header-cell *matHeaderCellDef>Tickets Asignados</th>
                      <td mat-cell *matCellDef="let item">{{ item.ticketsAssigned }}</td>
                    </ng-container>

                    <ng-container matColumnDef="ticketsResolved">
                      <th mat-header-cell *matHeaderCellDef>Tickets Resueltos</th>
                      <td mat-cell *matCellDef="let item">{{ item.ticketsResolved }}</td>
                    </ng-container>

                    <ng-container matColumnDef="avgResponseTime">
                      <th mat-header-cell *matHeaderCellDef>Tiempo Promedio de Respuesta</th>
                      <td mat-cell *matCellDef="let item">{{ formatTime(item.avgResponseTime) }}</td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="['day', 'ticketsAssigned', 'ticketsResolved', 'avgResponseTime']"></tr>
                    <tr mat-row *matRowDef="let row; columns: ['day', 'ticketsAssigned', 'ticketsResolved', 'avgResponseTime'];"></tr>
                  </table>
                </div>
              </mat-tab>
            </mat-tab-group>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- No hay datos -->
      <div *ngIf="!loading && !hasData" class="text-center py-8">
        <mat-icon class="text-gray-400 text-7xl">analytics_off</mat-icon>
        <p class="text-xl font-medium mt-4">No hay datos para mostrar</p>
        <p class="text-gray-500 mt-2">Ajusta los filtros y genera el reporte nuevamente</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    table {
      width: 100%;
    }
  `]
})
export class PerformanceReportComponent implements OnInit {
  filterForm: FormGroup;
  loading = false;
  hasData = false;
  supportUsers: UserProfile[] = [];
  performanceData: any = {
    resolvedTickets: 0,
    avgResolutionTime: 0,
    customerSatisfaction: 0,
    resolutionTimes: [],
    productivityData: []
  };

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private userService: UserService
  ) {
    this.filterForm = this.fb.group({
      startDate: [new Date(new Date().setDate(new Date().getDate() - 30))],
      endDate: [new Date()],
      supportAgent: ['']
    });
  }

  ngOnInit(): void {
    this.loadSupportUsers();
  }

  loadSupportUsers(): void {
    this.userService.getUsersByRole('support').subscribe(users => {
      this.supportUsers = users;
    });
  }

  generateReport(): void {
    this.loading = true;
    const filters = this.filterForm.value;

    // Para simulación, setTimeout. En producción, usaríamos reportService.getPerformanceReport(filters)
    setTimeout(() => {
      this.performanceData = this.getMockPerformanceData();
      this.loading = false;
      this.hasData = true;
    }, 1500);
  }

  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours < 24) {
      return `${hours}h ${remainingMinutes}m`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return `${days}d ${remainingHours}h ${remainingMinutes}m`;
  }

  // Mock data para simular un reporte
  private getMockPerformanceData(): any {
    return {
      resolvedTickets: 87,
      avgResolutionTime: 240, // 4 horas en minutos
      customerSatisfaction: 92,
      resolutionTimes: [
        { ticketId: 'TKT-1001', title: 'Problema de impresora', priority: 'Media', resolutionTime: 120, slaCompliance: true },
        { ticketId: 'TKT-1002', title: 'Error en aplicación', priority: 'Alta', resolutionTime: 60, slaCompliance: true },
        { ticketId: 'TKT-1003', title: 'Configuración de email', priority: 'Baja', resolutionTime: 180, slaCompliance: true },
        { ticketId: 'TKT-1004', title: 'Acceso a servidor', priority: 'Crítica', resolutionTime: 45, slaCompliance: true },
        { ticketId: 'TKT-1005', title: 'Actualización de software', priority: 'Media', resolutionTime: 360, slaCompliance: false }
      ],
      productivityData: [
        { day: 'Lunes', ticketsAssigned: 12, ticketsResolved: 10, avgResponseTime: 45 },
        { day: 'Martes', ticketsAssigned: 15, ticketsResolved: 14, avgResponseTime: 38 },
        { day: 'Miércoles', ticketsAssigned: 18, ticketsResolved: 15, avgResponseTime: 42 },
        { day: 'Jueves', ticketsAssigned: 14, ticketsResolved: 16, avgResponseTime: 36 },
        { day: 'Viernes', ticketsAssigned: 10, ticketsResolved: 12, avgResponseTime: 40 }
      ]
    };
  }
}
