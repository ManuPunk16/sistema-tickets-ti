import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ReportService } from '../../../../core/services/report.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TicketMetric } from '../../../../core/models/report.model';
import { UserProfile } from '../../../../core/models/user.model';
import { RolUsuario } from '../../../../core/enums/roles-usuario.enum';
import { finalize, catchError, of, take } from 'rxjs';

@Component({
  selector: 'app-dashboard-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule
  ],
  templateUrl: './dashboard-report.component.html',
  styleUrl: './dashboard-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardReportComponent {
  private readonly fb = inject(FormBuilder);
  private readonly reportService = inject(ReportService);
  private readonly authService = inject(AuthService);

  protected readonly metrics = signal<TicketMetric | null>(null);
  protected readonly loading = signal(false);
  protected readonly usuarioActual = signal<UserProfile | null>(null);

  protected readonly esUsuarioNormal = computed(() =>
    this.usuarioActual()?.role === RolUsuario.User
  );

  protected readonly departamentoUsuario = computed(() =>
    this.usuarioActual()?.department ?? null
  );

  protected readonly filterForm: FormGroup;

  protected readonly resolutionRate = computed(() => {
    const metricsValue = this.metrics();
    if (!metricsValue || metricsValue.totalTickets === 0) return 0;

    const resolved = (metricsValue.ticketsByStatus['resuelto'] || 0) +
                     (metricsValue.ticketsByStatus['cerrado'] || 0);
    return Math.round((resolved / metricsValue.totalTickets) * 100);
  });

  protected readonly unresolvedTickets = computed(() => {
    const metricsValue = this.metrics();
    if (!metricsValue) return 0;

    const resolved = (metricsValue.ticketsByStatus['resuelto'] || 0) +
                     (metricsValue.ticketsByStatus['cerrado'] || 0);
    return metricsValue.totalTickets - resolved;
  });

  constructor() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.filterForm = this.fb.group({
      startDate: [this.formatDateForInput(thirtyDaysAgo)],
      endDate: [this.formatDateForInput(today)]
    });

    // Cargar usuario y datos al inicializar — sin ngOnInit
    this.authService.getCurrentUser().pipe(take(1)).subscribe({
      next: usuario => {
        this.usuarioActual.set(usuario);
        this.loadReportData();
      },
    });
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
    this.loading.set(true);
    const { startDate, endDate } = this.filterForm.value;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    this.reportService.getTicketMetrics(start, end)
      .pipe(
        catchError(() => of(null)),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (metrics) => {
          this.metrics.set(metrics);
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

    const resolved = (metrics.ticketsByStatus['resuelto'] || 0) +
                     (metrics.ticketsByStatus['cerrado'] || 0);
    return Math.round((resolved / metrics.totalTickets) * 100);
  }

  countUnresolvedTickets(metrics: TicketMetric | null): number {
    if (!metrics) return 0;

    const resolved = (metrics.ticketsByStatus['resuelto'] || 0) +
                     (metrics.ticketsByStatus['cerrado'] || 0);
    return metrics.totalTickets - resolved;
  }

  getStatusDistribution(metrics: TicketMetric): any[] {
    if (!metrics) return [];

    const result = [];
    const total = metrics.totalTickets;

    for (const status in metrics.ticketsByStatus) {
      const count = metrics.ticketsByStatus[status] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      result.push({ status, count, percentage });
    }

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
      'nuevo': '#3B82F6',
      'asignado': '#8B5CF6',
      'en_proceso': '#F59E0B',
      'en_espera': '#F97316',
      'resuelto': '#10B981',
      'cerrado': '#6B7280'
    };

    return colors[status] || '#6B7280';
  }

  getPriorityDistribution(metrics: TicketMetric): any[] {
    if (!metrics) return [];

    const result = [];
    const total = metrics.totalTickets;

    for (const priority in metrics.ticketsByPriority) {
      const count = metrics.ticketsByPriority[priority] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      result.push({ priority, count, percentage });
    }

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
      'baja': '#10B981',
      'media': '#3B82F6',
      'alta': '#F97316',
      'critica': '#EF4444'
    };

    return colors[priority] || '#6B7280';
  }

  getDepartmentDistribution(metrics: TicketMetric): any[] {
    if (!metrics) return [];

    const result = [];
    const total = metrics.totalTickets;

    for (const dept in metrics.ticketsByDepartment) {
      const count = metrics.ticketsByDepartment[dept] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      result.push({ department: dept, count, percentage });
    }

    return result.sort((a, b) => b.count - a.count);
  }

  getCategoryDistribution(metrics: TicketMetric): any[] {
    if (!metrics) return [];

    const result = [];
    const total = metrics.totalTickets;

    for (const category in metrics.ticketsByCategory) {
      const count = metrics.ticketsByCategory[category] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      result.push({ category, count, percentage });
    }

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
