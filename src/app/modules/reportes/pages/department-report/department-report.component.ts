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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';

import { ReportService } from '../../../../core/services/report.service';
import { DepartmentService } from '../../../../core/services/department.service';

@Component({
  selector: 'app-department-report',
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
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTableModule
  ],
  template: `
    <div class="p-4 md:p-6">
      <div class="flex items-center mb-6">
        <button mat-icon-button [routerLink]="['/reportes']" matTooltip="Volver">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="text-2xl font-bold ml-2">Reporte por Departamentos</h1>
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
              <mat-label>Departamento</mat-label>
              <mat-select formControlName="department">
                <mat-option value="">Todos</mat-option>
                <mat-option *ngFor="let dept of departments" [value]="dept">
                  {{ dept }}
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
      <div *ngIf="!loading && hasData" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <!-- KPIs generales -->
          <mat-card>
            <mat-card-content class="p-4">
              <div class="text-center">
                <h2 class="text-gray-500">Total Tickets</h2>
                <p class="text-4xl font-bold">{{ reportData.totalTickets }}</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content class="p-4">
              <div class="text-center">
                <h2 class="text-gray-500">Tiempo Promedio de Resolución</h2>
                <p class="text-4xl font-bold">{{ formatTime(reportData.avgResolutionTime) }}</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content class="p-4">
              <div class="text-center">
                <h2 class="text-gray-500">Tasa de Resolución</h2>
                <p class="text-4xl font-bold">{{ reportData.resolutionRate }}%</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Tabla de departamentos -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Estadísticas por Departamento</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="reportData.departmentStats" class="w-full">
              <!-- Department Column -->
              <ng-container matColumnDef="department">
                <th mat-header-cell *matHeaderCellDef>Departamento</th>
                <td mat-cell *matCellDef="let item">{{ item.department }}</td>
              </ng-container>

              <!-- Tickets Count Column -->
              <ng-container matColumnDef="ticketCount">
                <th mat-header-cell *matHeaderCellDef>Tickets</th>
                <td mat-cell *matCellDef="let item">{{ item.ticketCount }}</td>
              </ng-container>

              <!-- Percentage Column -->
              <ng-container matColumnDef="percentage">
                <th mat-header-cell *matHeaderCellDef>Porcentaje</th>
                <td mat-cell *matCellDef="let item">
                  <div class="flex items-center">
                    <span class="mr-2">{{ item.percentage }}%</span>
                    <div class="w-32 bg-gray-200 rounded-full h-2.5">
                      <div class="h-2.5 rounded-full bg-blue-600" [style.width.%]="item.percentage"></div>
                    </div>
                  </div>
                </td>
              </ng-container>

              <!-- Avg Resolution Time Column -->
              <ng-container matColumnDef="avgResolutionTime">
                <th mat-header-cell *matHeaderCellDef>Tiempo Promedio</th>
                <td mat-cell *matCellDef="let item">{{ formatTime(item.avgResolutionTime) }}</td>
              </ng-container>

              <!-- Resolution Rate Column -->
              <ng-container matColumnDef="resolutionRate">
                <th mat-header-cell *matHeaderCellDef>Tasa de Resolución</th>
                <td mat-cell *matCellDef="let item">{{ item.resolutionRate }}%</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </mat-card-content>
        </mat-card>

        <!-- Tabla de tipos de problemas -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Tipos de Problemas por Departamento</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="reportData.issueTypes" class="w-full">
              <ng-container matColumnDef="department">
                <th mat-header-cell *matHeaderCellDef>Departamento</th>
                <td mat-cell *matCellDef="let item">{{ item.department }}</td>
              </ng-container>

              <ng-container matColumnDef="mostCommonIssue">
                <th mat-header-cell *matHeaderCellDef>Problema más común</th>
                <td mat-cell *matCellDef="let item">{{ item.mostCommonIssue }}</td>
              </ng-container>

              <ng-container matColumnDef="occurrences">
                <th mat-header-cell *matHeaderCellDef>Ocurrencias</th>
                <td mat-cell *matCellDef="let item">{{ item.occurrences }}</td>
              </ng-container>

              <ng-container matColumnDef="avgTimeToResolve">
                <th mat-header-cell *matHeaderCellDef>Tiempo promedio</th>
                <td mat-cell *matCellDef="let item">{{ formatTime(item.avgTimeToResolve) }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="issueColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: issueColumns;"></tr>
            </table>
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
export class DepartmentReportComponent implements OnInit {
  filterForm: FormGroup;
  loading = false;
  hasData = false;
  departments: string[] = [];
  reportData: any = {};
  displayedColumns: string[] = ['department', 'ticketCount', 'percentage', 'avgResolutionTime', 'resolutionRate'];
  issueColumns: string[] = ['department', 'mostCommonIssue', 'occurrences', 'avgTimeToResolve'];

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private departmentService: DepartmentService
  ) {
    this.filterForm = this.fb.group({
      startDate: [new Date(new Date().setDate(new Date().getDate() - 30))],
      endDate: [new Date()],
      department: ['']
    });
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.departmentService.getDepartments().subscribe(depts => {
      this.departments = depts;
    });
  }

  generateReport(): void {
    this.loading = true;
    const filters = this.filterForm.value;

    // Simulación, en producción usaríamos reportService.getDepartmentReport(filters)
    setTimeout(() => {
      this.reportData = this.getMockReportData();
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
  private getMockReportData(): any {
    return {
      totalTickets: 235,
      avgResolutionTime: 185, // minutos
      resolutionRate: 88,
      departmentStats: [
        { department: 'Recursos Humanos', ticketCount: 45, percentage: 19, avgResolutionTime: 120, resolutionRate: 91 },
        { department: 'Contabilidad', ticketCount: 32, percentage: 14, avgResolutionTime: 140, resolutionRate: 87 },
        { department: 'Ventas', ticketCount: 65, percentage: 28, avgResolutionTime: 210, resolutionRate: 82 },
        { department: 'Marketing', ticketCount: 28, percentage: 12, avgResolutionTime: 175, resolutionRate: 89 },
        { department: 'Operaciones', ticketCount: 50, percentage: 21, avgResolutionTime: 220, resolutionRate: 85 },
        { department: 'Dirección', ticketCount: 15, percentage: 6, avgResolutionTime: 95, resolutionRate: 93 }
      ],
      issueTypes: [
        { department: 'Recursos Humanos', mostCommonIssue: 'Acceso a sistemas', occurrences: 18, avgTimeToResolve: 85 },
        { department: 'Contabilidad', mostCommonIssue: 'Error en aplicación contable', occurrences: 15, avgTimeToResolve: 180 },
        { department: 'Ventas', mostCommonIssue: 'Problemas con CRM', occurrences: 24, avgTimeToResolve: 145 },
        { department: 'Marketing', mostCommonIssue: 'Acceso a redes sociales', occurrences: 12, avgTimeToResolve: 70 },
        { department: 'Operaciones', mostCommonIssue: 'Fallos hardware', occurrences: 22, avgTimeToResolve: 210 },
        { department: 'Dirección', mostCommonIssue: 'Configuración email', occurrences: 8, avgTimeToResolve: 60 }
      ]
    };
  }
}
