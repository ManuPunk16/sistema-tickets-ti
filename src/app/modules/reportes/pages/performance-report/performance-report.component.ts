import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ReportService } from '../../../../core/services/report.service';
import { UserService } from '../../../../core/services/user.service';
import { UserProfile } from '../../../../core/models/user.model';
import { Subject, takeUntil, finalize, catchError, of, map } from 'rxjs';

interface PerformanceData {
  resolvedTickets: number;
  avgResolutionTime: number;
  customerSatisfaction: number;
  resolutionTimes: ResolutionTimeItem[];
  productivityData: ProductivityItem[];
}

interface ResolutionTimeItem {
  ticketId: string;
  title: string;
  priority: string;
  resolutionTime: number;
  slaCompliance: boolean;
}

interface ProductivityItem {
  day: string;
  ticketsAssigned: number;
  ticketsResolved: number;
  avgResponseTime: number;
  noDataPeriod?: boolean;
}

type ColumnaResolucion = 'ticketId' | 'title' | 'priority' | 'resolutionTime' | 'slaStatus';
type ColumnaProductividad = 'day' | 'ticketsAssigned' | 'ticketsResolved' | 'avgResponseTime' | 'efficiency';
type DireccionOrden = 'asc' | 'desc' | null;

@Component({
  selector: 'app-performance-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './performance-report.component.html',
  styleUrl: './performance-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceReportComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private reportService = inject(ReportService);
  private userService = inject(UserService);

  filterForm = this.fb.group({
    startDate: [this.formatDateForInput(this.fechaHaceNDias(30))],
    endDate: [this.formatDateForInput(new Date())],
    supportAgent: [''],
  });

  // Estado reactivo con signals
  loading = signal(false);
  hasData = signal(false);
  supportUsers = signal<UserProfile[]>([]);
  activeTab = signal<'resolution' | 'productivity'>('resolution');

  performanceData = signal<PerformanceData>({
    resolvedTickets: 0,
    avgResolutionTime: 0,
    customerSatisfaction: 0,
    resolutionTimes: [],
    productivityData: [],
  });

  // Paginación — tabla resolución
  paginaResolucion = signal(1);
  tamanioPaginaResolucion = signal(10);
  ordenColumnaResolucion = signal<ColumnaResolucion | null>(null);
  ordenDireccionResolucion = signal<DireccionOrden>(null);

  // Paginación — tabla productividad
  paginaProductividad = signal(1);
  tamanioPaginaProductividad = signal(10);
  ordenColumnaProductividad = signal<ColumnaProductividad | null>(null);
  ordenDireccionProductividad = signal<DireccionOrden>(null);

  // Datos ordenados y paginados para resolución
  datosResolucionOrdenados = computed(() => {
    const datos = [...(this.performanceData().resolutionTimes ?? [])];
    const col = this.ordenColumnaResolucion();
    const dir = this.ordenDireccionResolucion();
    if (col && dir) {
      datos.sort((a, b) => {
        const va = a[col as keyof ResolutionTimeItem];
        const vb = b[col as keyof ResolutionTimeItem];
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return dir === 'asc' ? cmp : -cmp;
      });
    }
    return datos;
  });

  totalPaginasResolucion = computed(() =>
    Math.max(1, Math.ceil(this.datosResolucionOrdenados().length / this.tamanioPaginaResolucion()))
  );

  datosResolucionPaginados = computed(() => {
    const inicio = (this.paginaResolucion() - 1) * this.tamanioPaginaResolucion();
    return this.datosResolucionOrdenados().slice(inicio, inicio + this.tamanioPaginaResolucion());
  });

  // Datos ordenados y paginados para productividad
  datosProductividadOrdenados = computed(() => {
    const datos = [...(this.performanceData().productivityData ?? [])];
    const col = this.ordenColumnaProductividad();
    const dir = this.ordenDireccionProductividad();
    if (col && dir) {
      datos.sort((a, b) => {
        const va = a[col as keyof ProductivityItem];
        const vb = b[col as keyof ProductivityItem];
        const cmp = (va ?? 0) < (vb ?? 0) ? -1 : (va ?? 0) > (vb ?? 0) ? 1 : 0;
        return dir === 'asc' ? cmp : -cmp;
      });
    }
    return datos;
  });

  totalPaginasProductividad = computed(() =>
    Math.max(1, Math.ceil(this.datosProductividadOrdenados().length / this.tamanioPaginaProductividad()))
  );

  datosProductividadPaginados = computed(() => {
    const inicio = (this.paginaProductividad() - 1) * this.tamanioPaginaProductividad();
    return this.datosProductividadOrdenados().slice(inicio, inicio + this.tamanioPaginaProductividad());
  });

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.cargarUsuariosSoporte();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarUsuariosSoporte(): void {
    this.userService
      .getUsersByRole('support')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: users => this.supportUsers.set(users),
      });
  }

  generateReport(): void {
    this.loading.set(true);
    this.hasData.set(false);

    const filters = this.filterForm.value;
    const startDate = new Date(filters.startDate!);
    const endDate = new Date(filters.endDate!);
    const supportAgent = filters.supportAgent || null;

    this.reportService
      .executeTicketsQuery(startDate, endDate)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          this.loading.set(false);
          return of([]);
        }),
        map(tickets => {
          const userMetrics = this.reportService.processUserMetrics(tickets);
          const ticketMetrics = this.reportService.processTicketMetrics(tickets);
          const timeSeriesData = this.reportService.processTimeSeriesData(tickets, 'day');
          return { userMetrics, ticketMetrics, timeSeriesData, tickets };
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: data => {
          try {
            const processed = this.processPerformanceData(data, supportAgent);
            if (processed) {
              this.performanceData.set(processed);
              this.hasData.set(true);
              // Reiniciar paginación al generar nuevo reporte
              this.paginaResolucion.set(1);
              this.paginaProductividad.set(1);
            }
          } catch {
            this.hasData.set(false);
          }
        },
      });
  }

  // ──────────── Ordenamiento ────────────

  ordenarResolucion(columna: ColumnaResolucion): void {
    if (this.ordenColumnaResolucion() === columna) {
      const siguiente: DireccionOrden = this.ordenDireccionResolucion() === 'asc' ? 'desc' : null;
      this.ordenDireccionResolucion.set(siguiente);
      if (!siguiente) this.ordenColumnaResolucion.set(null);
    } else {
      this.ordenColumnaResolucion.set(columna);
      this.ordenDireccionResolucion.set('asc');
    }
    this.paginaResolucion.set(1);
  }

  ordenarProductividad(columna: ColumnaProductividad): void {
    if (this.ordenColumnaProductividad() === columna) {
      const siguiente: DireccionOrden = this.ordenDireccionProductividad() === 'asc' ? 'desc' : null;
      this.ordenDireccionProductividad.set(siguiente);
      if (!siguiente) this.ordenColumnaProductividad.set(null);
    } else {
      this.ordenColumnaProductividad.set(columna);
      this.ordenDireccionProductividad.set('asc');
    }
    this.paginaProductividad.set(1);
  }

  iconoOrdenResolucion(columna: ColumnaResolucion): string {
    if (this.ordenColumnaResolucion() !== columna) return '↕';
    return this.ordenDireccionResolucion() === 'asc' ? '↑' : '↓';
  }

  iconoOrdenProductividad(columna: ColumnaProductividad): string {
    if (this.ordenColumnaProductividad() !== columna) return '↕';
    return this.ordenDireccionProductividad() === 'asc' ? '↑' : '↓';
  }

  // ──────────── Paginación ────────────

  paginaAnteriorResolucion(): void {
    if (this.paginaResolucion() > 1) this.paginaResolucion.update(p => p - 1);
  }

  paginaSiguienteResolucion(): void {
    if (this.paginaResolucion() < this.totalPaginasResolucion()) this.paginaResolucion.update(p => p + 1);
  }

  paginaAnteriorProductividad(): void {
    if (this.paginaProductividad() > 1) this.paginaProductividad.update(p => p - 1);
  }

  paginaSiguienteProductividad(): void {
    if (this.paginaProductividad() < this.totalPaginasProductividad()) this.paginaProductividad.update(p => p + 1);
  }

  // ──────────── Utilidades ────────────

  hasOnlyEmptyProductivityData(): boolean {
    const datos = this.performanceData().productivityData;
    if (!datos || datos.length === 0) return true;
    if (datos.length === 1) {
      const item = datos[0];
      return (item.noDataPeriod === true) || (item.ticketsAssigned === 0 && item.ticketsResolved === 0);
    }
    return datos.every(item => item.ticketsAssigned === 0 && item.ticketsResolved === 0);
  }

  clasePrioridad(priority: string): string {
    const mapa: { [key: string]: string } = {
      Baja: 'bg-green-100 text-green-800',
      Media: 'bg-blue-100 text-blue-800',
      Alta: 'bg-orange-100 text-orange-800',
      Crítica: 'bg-red-100 text-red-800',
    };
    return mapa[priority] ?? 'bg-gray-100 text-gray-800';
  }

  claseEficiencia(resolved: number, assigned: number): string {
    if (assigned === 0) return 'bg-gray-100 text-gray-700';
    const ef = (resolved / assigned) * 100;
    if (ef >= 90) return 'bg-green-100 text-green-800';
    if (ef >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  colorBarraEficiencia(resolved: number, assigned: number): string {
    if (assigned === 0) return 'bg-gray-300';
    const ef = (resolved / assigned) * 100;
    if (ef >= 90) return 'bg-green-500';
    if (ef >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  anchoBarraEficiencia(resolved: number, assigned: number): string {
    if (assigned === 0) return '0%';
    return `${Math.min(100, Math.round((resolved / assigned) * 100))}%`;
  }

  claseIndicadorSatisfaccion(valor: number): string {
    if (valor >= 90) return 'bg-green-500';
    if (valor >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  formatTime(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days}d ${remainHours}h ${mins}m`;
  }

  formatTimeShort(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  getShortPriority(priority: string): string {
    const mapa: { [key: string]: string } = {
      Baja: 'B', Media: 'M', Alta: 'A', Crítica: 'C', 'N/A': '-',
    };
    return mapa[priority] ?? priority.charAt(0);
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private fechaHaceNDias(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }

  private processPerformanceData(data: any, supportAgent: string | null): PerformanceData {
    try {
      const { userMetrics, ticketMetrics, timeSeriesData } = data;

      if (!userMetrics || userMetrics.length === 0) {
        return {
          resolvedTickets: ticketMetrics?.resolvedTickets || 0,
          avgResolutionTime: ticketMetrics?.avgResolutionTime || 0,
          customerSatisfaction: 0,
          resolutionTimes: [],
          productivityData: this.generateProductivityData(timeSeriesData, supportAgent),
        };
      }

      const filteredUserMetrics = supportAgent
        ? userMetrics.filter((u: any) => u.userId === supportAgent)
        : userMetrics;

      if (filteredUserMetrics.length === 0 && supportAgent) {
        return { resolvedTickets: 0, avgResolutionTime: 0, customerSatisfaction: 0, resolutionTimes: [], productivityData: [] };
      }

      const resolvedTickets =
        filteredUserMetrics.reduce((total: number, user: any) => total + user.ticketsResolved, 0) ||
        ticketMetrics?.resolvedTickets || 0;

      const avgResolutionTime =
        filteredUserMetrics.length > 0
          ? filteredUserMetrics.reduce((total: number, user: any) =>
              total + user.avgResolutionTime * user.ticketsResolved, 0) / (resolvedTickets || 1)
          : ticketMetrics?.avgResolutionTime || 0;

      const customerSatisfaction =
        ticketMetrics?.resolvedTickets > 0
          ? Math.round((ticketMetrics.resolvedOnTime / ticketMetrics.resolvedTickets) * 100)
          : 0;

      return {
        resolvedTickets: resolvedTickets || 0,
        avgResolutionTime: Math.round(avgResolutionTime) || 0,
        customerSatisfaction,
        resolutionTimes: this.getResolutionTimes(data),
        productivityData: this.generateProductivityData(timeSeriesData, supportAgent),
      };
    } catch {
      return { resolvedTickets: 1, avgResolutionTime: 0, customerSatisfaction: 100, resolutionTimes: [], productivityData: [] };
    }
  }

  private getResolutionTimes(data: any): ResolutionTimeItem[] {
    if (data.ticketMetrics?.totalTickets > 0 && Array.isArray(data.tickets)) {
      const resolved = data.tickets.filter((t: any) => t.status === 'resuelto' || t.status === 'cerrado');
      if (resolved.length > 0) {
        return resolved.map((ticket: any) => {
          const created = new Date(ticket.createdAt);
          const resolvedDate = new Date(ticket.resolvedAt || new Date());
          const resolutionTime = Math.round((resolvedDate.getTime() - created.getTime()) / 60000);
          const slaMap: { [k: string]: number } = { critica: 240, alta: 480, media: 1440, baja: 2880 };
          const targetTime = slaMap[ticket.priority] ?? 2880;
          return {
            ticketId: ticket.id ?? `TKT-${Math.floor(Math.random() * 10000)}`,
            title: ticket.title ?? 'Sin título',
            priority: this.formatPriority(ticket.priority ?? 'media'),
            resolutionTime,
            slaCompliance: resolutionTime <= targetTime,
          };
        });
      }
    }
    return [{ ticketId: 'N/A', title: 'No hay tickets resueltos en el período seleccionado', priority: 'N/A', resolutionTime: 0, slaCompliance: true }];
  }

  private formatPriority(p: string): string {
    const m: { [k: string]: string } = { baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica' };
    return m[p] ?? p;
  }

  private generateProductivityData(timeSeriesData: any, _supportAgent: string | null): ProductivityItem[] {
    if (!timeSeriesData ||
        (!timeSeriesData.created?.length && !timeSeriesData.resolved?.length)) {
      return [{ day: 'Sin datos', ticketsAssigned: 0, ticketsResolved: 0, avgResponseTime: 0, noDataPeriod: true }];
    }

    const resolvedByDay = new Map<string, number>();
    timeSeriesData.resolved?.forEach((item: any) => resolvedByDay.set(item.date, item.count));

    const createdByDay = new Map<string, number>();
    timeSeriesData.created?.forEach((item: any) => createdByDay.set(item.date, item.count));

    const allDates = Array.from(new Set([...resolvedByDay.keys(), ...createdByDay.keys()])).sort();

    if (allDates.length === 0) {
      return this.generateDefaultProductivityData();
    }

    return allDates.map(dateStr => {
      const date = new Date(`${dateStr}T12:00:00Z`);
      const ticketsResolved = resolvedByDay.get(dateStr) ?? 0;
      const ticketsAssigned = createdByDay.get(dateStr) ?? 0;
      return {
        day: this.getDayName(date),
        ticketsAssigned,
        ticketsResolved,
        avgResponseTime: ticketsResolved > 0 ? Math.max(20, ticketsAssigned * 5) : 0,
      };
    });
  }

  private generateDefaultProductivityData(): ProductivityItem[] {
    return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => ({
      day, ticketsAssigned: 0, ticketsResolved: 0, avgResponseTime: 0,
    }));
  }

  private getDayName(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) return 'Desconocido';
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[utcDate.getUTCDay()] ?? 'Desconocido';
  }
}
