import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ReportService } from '../../../../core/services/report.service';
import { TicketMetric } from '../../../../core/models/report.model';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';

@Component({
  selector: 'app-dashboard-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule
  ],
  templateUrl: './dashboard-report.component.html',
  styleUrls: ['./dashboard-report.component.scss']
})

export class DashboardReportComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  metrics: TicketMetric | null = null;
  loading = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService
  ) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.filterForm = this.fb.group({
      startDate: [this.formatDateForInput(thirtyDaysAgo)],
      endDate: [this.formatDateForInput(today)]
    });
  }

  ngOnInit(): void {
    this.loadReportData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    this.loadReportData();
  }

  resetFilters(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.filterForm.patchValue({
      startDate: this.formatDateForInput(thirtyDaysAgo),
      endDate: this.formatDateForInput(today)
    });

    this.loadReportData();
  }

  private loadReportData(): void {
    this.loading = true;
    const { startDate, endDate } = this.filterForm.value;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Asegurarse de que la fecha de fin sea el final del día
    end.setHours(23, 59, 59, 999);

    this.reportService.getTicketMetrics(start, end)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error al cargar las métricas:', error);
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (metrics) => {
          this.metrics = metrics;
        }
      });
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
  
  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
