import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { ReportService } from '../../../../core/services/report.service';
import { TicketMetric } from '../../../../core/models/report.model';

@Component({
  selector: 'app-dashboard-report',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDividerModule,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule
  ],
  template: `
    <div class="p-4 md:p-6">
      <h1 class="text-2xl font-bold mb-6">Reportes y Estadísticas</h1>

      <!-- Filtros de fechas -->
      <mat-card class="mb-6">
        <mat-card-content>
          <form [formGroup]="filterForm" class="flex flex-col md:flex-row gap-4 items-end">
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

            <button mat-raised-button color="primary" (click)="applyFilters()">
              <mat-icon>filter_alt</mat-icon>
              Aplicar filtros
            </button>

            <button mat-stroked-button (click)="resetFilters()">
              <mat-icon>clear</mat-icon>
              Limpiar
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Acceso rápido a otros reportes -->
      <div class="mb-6 flex flex-wrap gap-3">
        <a mat-stroked-button color="primary" [routerLink]="['/reportes/rendimiento']">
          <mat-icon>speed</mat-icon>
          Reporte de Rendimiento
        </a>
        <a mat-stroked-button color="primary" [routerLink]="['/reportes/departamentos']">
          <mat-icon>business</mat-icon>
          Reporte por Departamentos
        </a>
      </div>

      <!-- Resumen de métricas -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <mat-card>
          <mat-card-content>
            <div class="text-center">
              <h3 class="text-gray-500 text-lg">Total de Tickets</h3>
              <p class="text-4xl font-bold">{{ metrics?.totalTickets || 0 }}</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content>
            <div class="text-center">
              <h3 class="text-gray-500 text-lg">Tiempo Promedio de Resolución</h3>
              <p class="text-4xl font-bold">{{ formatTime(metrics?.avgResolutionTime || 0) }}</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content>
            <div class="text-center">
              <h3 class="text-gray-500 text-lg">Tasa de Resolución</h3>
              <p class="text-4xl font-bold">{{ calculateResolutionRate(metrics) }}%</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content>
            <div class="text-center">
              <h3 class="text-gray-500 text-lg">Tickets sin Resolver</h3>
              <p class="text-4xl font-bold">{{ countUnresolvedTickets(metrics) }}</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Distribuciones -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Distribución por Estado -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Distribución por Estado</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="metrics" class="p-4">
              <div *ngFor="let item of getStatusDistribution(metrics)" class="mb-3">
                <div class="flex justify-between mb-1">
                  <span>{{ formatStatus(item.status) }}</span>
                  <span>{{ item.count }} ({{ item.percentage }}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                  <div class="h-2.5 rounded-full" [ngStyle]="{width: item.percentage + '%', backgroundColor: getStatusColor(item.status) }"></div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Distribución por Prioridad -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Distribución por Prioridad</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="metrics" class="p-4">
              <div *ngFor="let item of getPriorityDistribution(metrics)" class="mb-3">
                <div class="flex justify-between mb-1">
                  <span>{{ formatPriority(item.priority) }}</span>
                  <span>{{ item.count }} ({{ item.percentage }}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                  <div class="h-2.5 rounded-full" [ngStyle]="{width: item.percentage + '%', backgroundColor: getPriorityColor(item.priority) }"></div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Distribución por Departamentos y Categorías -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Por Departamento -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Tickets por Departamento</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="metrics" class="p-4">
              <div *ngFor="let item of getDepartmentDistribution(metrics)" class="mb-3">
                <div class="flex justify-between mb-1">
                  <span>{{ item.department }}</span>
                  <span>{{ item.count }} ({{ item.percentage }}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                  <div class="h-2.5 rounded-full bg-blue-600" [ngStyle]="{width: item.percentage + '%'}"></div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Por Categoría -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Tickets por Categoría</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="metrics" class="p-4">
              <div *ngFor="let item of getCategoryDistribution(metrics)" class="mb-3">
                <div class="flex justify-between mb-1">
                  <span>{{ formatCategory(item.category) }}</span>
                  <span>{{ item.count }} ({{ item.percentage }}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                  <div class="h-2.5 rounded-full bg-purple-600" [ngStyle]="{width: item.percentage + '%'}"></div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DashboardReportComponent implements OnInit {
  filterForm: FormGroup;
  metrics: TicketMetric | null = null;

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService
  ) {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.filterForm = this.fb.group({
      startDate: [thirtyDaysAgo],
      endDate: [today]
    });
  }

  ngOnInit(): void {
    this.loadReportData();
  }

  applyFilters(): void {
    this.loadReportData();
  }

  resetFilters(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.filterForm.patchValue({
      startDate: thirtyDaysAgo,
      endDate: today
    });

    this.loadReportData();
  }

  private loadReportData(): void {
    const { startDate, endDate } = this.filterForm.value;

    this.reportService.getTicketMetrics(startDate, endDate).subscribe(
      metrics => {
        this.metrics = metrics;
      }
    );
  }

  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    } else if (minutes < 1440) {
      return `${Math.round(minutes / 60)} h`;
    } else {
      return `${Math.round(minutes / 1440)} d`;
    }
  }

  calculateResolutionRate(metrics: TicketMetric | null): number {
    if (!metrics || metrics.totalTickets === 0) return 0;

    const resolved = (metrics.ticketsByStatus['resuelto'] || 0) + (metrics.ticketsByStatus['cerrado'] || 0);
    return Math.round((resolved / metrics.totalTickets) * 100);
  }

  countUnresolvedTickets(metrics: TicketMetric | null): number {
    if (!metrics) return 0;

    const resolved = (metrics.ticketsByStatus['resuelto'] || 0) + (metrics.ticketsByStatus['cerrado'] || 0);
    return metrics.totalTickets - resolved;
  }

  getStatusDistribution(metrics: TicketMetric): any[] {
    if (!metrics) return [];

    const result = [];
    let total = metrics.totalTickets;

    for (const status in metrics.ticketsByStatus) {
      const count = metrics.ticketsByStatus[status] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      result.push({
        status,
        count,
        percentage
      });
    }

    // Ordenar por cantidad descendente
    return result.sort((a, b) => b.count - a.count);
  }

  formatStatus(status: string): string {
    const map: {[key: string]: string} = {
      'nuevo': 'Nuevo',
      'asignado': 'Asignado',
      'en_proceso': 'En Proceso',
      'en_espera': 'En Espera',
      'resuelto': 'Resuelto',
      'cerrado': 'Cerrado'
    };

    return map[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: {[key: string]: string} = {
      'nuevo': '#3B82F6', // blue
      'asignado': '#8B5CF6', // purple
      'en_proceso': '#F59E0B', // yellow
      'en_espera': '#F97316', // orange
      'resuelto': '#10B981', // green
      'cerrado': '#6B7280' // gray
    };

    return colors[status] || '#6B7280';
  }

  getPriorityDistribution(metrics: TicketMetric): any[] {
    if (!metrics) return [];

    const result = [];
    let total = metrics.totalTickets;

    for (const priority in metrics.ticketsByPriority) {
      const count = metrics.ticketsByPriority[priority] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      result.push({
        priority,
        count,
        percentage
      });
    }

    // Ordenar por prioridad
    const order = ['critica', 'alta', 'media', 'baja'];
    return result.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority));
  }

  formatPriority(priority: string): string {
    const map: {[key: string]: string} = {
      'baja': 'Baja',
      'media': 'Media',
      'alta': 'Alta',
      'critica': 'Crítica'
    };

    return map[priority] || priority;
  }

  getPriorityColor(priority: string): string {
    const colors: {[key: string]: string} = {
      'baja': '#10B981', // green
      'media': '#3B82F6', // blue
      'alta': '#F97316', // orange
      'critica': '#EF4444' // red
    };

    return colors[priority] || '#6B7280';
  }

  getDepartmentDistribution(metrics: TicketMetric): any[] {
    if (!metrics) return [];

    const result = [];
    let total = metrics.totalTickets;

    for (const dept in metrics.ticketsByDepartment) {
      const count = metrics.ticketsByDepartment[dept] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      result.push({
        department: dept,
        count,
        percentage
      });
    }

    // Ordenar por cantidad descendente
    return result.sort((a, b) => b.count - a.count);
  }

  getCategoryDistribution(metrics: TicketMetric): any[] {
    if (!metrics) return [];

    const result = [];
    let total = metrics.totalTickets;

    for (const category in metrics.ticketsByCategory) {
      const count = metrics.ticketsByCategory[category] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      result.push({
        category,
        count,
        percentage
      });
    }

    // Ordenar por cantidad descendente
    return result.sort((a, b) => b.count - a.count);
  }

  formatCategory(category: string): string {
    const map: {[key: string]: string} = {
      'hardware': 'Hardware',
      'software': 'Software',
      'red': 'Red',
      'accesos': 'Accesos',
      'otro': 'Otro'
    };

    return map[category] || category;
  }
}
