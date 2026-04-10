import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DepartmentMetric, TicketMetric, TimeSeriesData, UserMetric } from '../models/report.model';
import { environment } from '../../../environments/environment';

// ─── Tipos de respuesta del API ────────────────────────────────────────────────

interface ResumenApiResponse {
  ok: boolean;
  resumen: {
    total: number;
    abiertos: number;
    resueltos: number;
    cerrados: number;
    tiempoPromedioMinutos: number | null;
    tiempoPromedioHoras: number | null;
    satisfaccionPromedio: number | null;
  };
  porEstado: Record<string, number>;
  porPrioridad: Record<string, number>;
  porCategoria: Record<string, number>;
}

interface DepartamentoApiItem {
  departamento: string;
  total: number;
  abiertos: number;
  resueltos: number;
  cerrados: number;
  tiempoPromedioHoras: number | null;
  satisfaccionPromedio: number | null;
}

interface DepartamentoApiResponse {
  ok: boolean;
  porDepartamento: DepartamentoApiItem[];
}

interface AgenteApiItem {
  uid: string;
  nombre: string;
  totalAsignados: number;
  resueltos: number;
  cerrados: number;
  tiempoPromedioHoras: number | null;
  satisfaccionPromedio: number | null;
  criticos: number;
  altos: number;
  tasaResolucion: number;
}

interface RendimientoApiResponse {
  ok: boolean;
  rendimientoPorAgente: AgenteApiItem[];
}

interface TicketsListApiResponse {
  ok: boolean;
  datos: Record<string, unknown>[];
  total: number;
  pagina: number;
  limite: number;
  paginas: number;
}

/**
 * Adapta un ticket del API (campos en español) al formato esperado por
 * los métodos process* (campos en inglés para compatibilidad con componentes legacy).
 */
function adaptarTicket(t: Record<string, unknown>): Record<string, unknown> {
  return {
    status:        t['estado'],
    priority:      t['prioridad'],
    category:      t['categoria'],
    department:    t['departamento'],
    createdBy:     t['creadoPorUid'],
    createdByName: t['creadoPorNombre'],
    assignedTo:    t['asignadoAUid'],
    assignedToName: t['asignadoANombre'],
    resolvedAt:    t['fechaResolucion'],
    createdAt:     t['createdAt'],
    updatedAt:     t['updatedAt'],
  };
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http     = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // ─── Métodos de alto nivel (usan agregaciones del servidor) ───────────────

  /** Métricas generales de tickets (KPIs del dashboard). */
  getTicketMetrics(_startDate?: Date, _endDate?: Date): Observable<TicketMetric> {
    return this.http.get<ResumenApiResponse>(`${this.apiUrl}/reportes/resumen`).pipe(
      map(r => ({
        totalTickets:       r.resumen.total,
        openTickets:        r.resumen.abiertos,
        resolvedTickets:    r.resumen.resueltos,
        avgResolutionTime:  r.resumen.tiempoPromedioMinutos ?? 0,
        ticketsByStatus:    r.porEstado,
        ticketsByPriority:  r.porPrioridad,
        ticketsByCategory:  r.porCategoria,
        ticketsByDepartment: {},
        resolvedOnTime:     0,
        resolvedLate:       0,
      } satisfies TicketMetric)),
      catchError(() => of({
        totalTickets: 0, openTickets: 0, resolvedTickets: 0, avgResolutionTime: 0,
        ticketsByStatus: {}, ticketsByPriority: {}, ticketsByCategory: {},
        ticketsByDepartment: {}, resolvedOnTime: 0, resolvedLate: 0,
      } satisfies TicketMetric)),
    );
  }

  /** Métricas por agente de soporte. */
  getUserMetrics(_startDate?: Date, _endDate?: Date): Observable<UserMetric[]> {
    return this.http.get<RendimientoApiResponse>(`${this.apiUrl}/reportes/rendimiento`).pipe(
      map(r => r.rendimientoPorAgente.map(a => ({
        userId:            a.uid,
        displayName:       a.nombre ?? '',
        ticketsCreated:    a.totalAsignados,
        ticketsResolved:   a.resueltos,
        avgResolutionTime: a.tiempoPromedioHoras != null ? Math.round(a.tiempoPromedioHoras * 60) : 0,
      } satisfies UserMetric))),
      catchError(() => of([] as UserMetric[])),
    );
  }

  /** Métricas por departamento. */
  getDepartmentMetrics(_startDate?: Date, _endDate?: Date): Observable<DepartmentMetric[]> {
    return this.http.get<DepartamentoApiResponse>(`${this.apiUrl}/reportes/departamento`).pipe(
      map(r => r.porDepartamento.map(d => ({
        department:        d.departamento ?? 'Sin departamento',
        ticketsCount:      d.total,
        resolvedCount:     d.resueltos,
        avgResolutionTime: d.tiempoPromedioHoras != null ? Math.round(d.tiempoPromedioHoras * 60) : 0,
      } satisfies DepartmentMetric))),
      catchError(() => of([] as DepartmentMetric[])),
    );
  }

  /**
   * Datos para series temporales.
   * Se calculan localmente sobre los tickets ya obtenidos para evitar
   * una petición adicional al API (endpoint /reportes/tendencia pendiente de implementar).
   */
  getTimeSeriesData(startDate?: Date, endDate?: Date, interval: 'day' | 'week' | 'month' = 'day'): Observable<TimeSeriesData> {
    return this.executeTicketsQuery(startDate, endDate).pipe(
      map(tickets => this.processTimeSeriesData(tickets, interval)),
    );
  }

  // ─── Query de tickets para componentes que procesan datos localmente ──────

  /**
   * Obtiene los tickets del API y los adapta a campos en inglés para que los
   * métodos process* sigan funcionando sin cambios.
   *
   * @deprecated Preferir getTicketMetrics / getDepartmentMetrics / getUserMetrics
   * que usan agregaciones del servidor.
   */
  public executeTicketsQuery(startDate?: Date, endDate?: Date): Observable<Record<string, unknown>[]> {
    let params = new HttpParams()
      .set('todos', 'true')
      .set('limite', '1000');

    if (startDate) params = params.set('desde', startDate.toISOString());
    if (endDate)   params = params.set('hasta',  endDate.toISOString());

    return this.http
      .get<TicketsListApiResponse>(`${this.apiUrl}/tickets`, { params })
      .pipe(
        map(r => r.datos.map(adaptarTicket)),
        catchError(() => of([] as Record<string, unknown>[])),
      );
  }

  // ─── Métodos de procesamiento local (sin dependencias de Firestore) ───────

  /** @deprecated Usar getTicketMetrics() */
  public processTicketMetrics(tickets: Record<string, unknown>[]): TicketMetric {
    const metrics: TicketMetric = {
      totalTickets: tickets.length, openTickets: 0, resolvedTickets: 0,
      avgResolutionTime: 0, ticketsByStatus: {}, ticketsByPriority: {},
      ticketsByCategory: {}, ticketsByDepartment: {}, resolvedOnTime: 0, resolvedLate: 0,
    };

    if (tickets.length === 0) return metrics;

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    tickets.forEach(ticket => {
      const status     = (ticket['status']     as string) || 'nuevo';
      const priority   = (ticket['priority']   as string) || 'media';
      const category   = (ticket['category']   as string) || 'otro';
      const department = (ticket['department'] as string) || 'Sin departamento';

      metrics.ticketsByStatus[status]         = (metrics.ticketsByStatus[status] || 0) + 1;
      metrics.ticketsByPriority[priority]     = (metrics.ticketsByPriority[priority] || 0) + 1;
      metrics.ticketsByCategory[category]     = (metrics.ticketsByCategory[category] || 0) + 1;
      metrics.ticketsByDepartment[department] = (metrics.ticketsByDepartment[department] || 0) + 1;

      if (status === 'resuelto' || status === 'cerrado') {
        metrics.resolvedTickets++;
        const resolvedAt = ticket['resolvedAt'] as string | undefined;
        const createdAt  = ticket['createdAt']  as string | undefined;

        if (resolvedAt && createdAt) {
          const resolutionTime = (new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / 60000;
          totalResolutionTime += resolutionTime;
          resolvedCount++;

          const slaMinutos: Record<string, number> = {
            critica: 2 * 60, alta: 8 * 60, media: 24 * 60, baja: 72 * 60,
          };
          const limite = slaMinutos[priority] ?? 24 * 60;
          resolutionTime <= limite ? metrics.resolvedOnTime++ : metrics.resolvedLate++;
        }
      } else {
        metrics.openTickets++;
      }
    });

    if (resolvedCount > 0) {
      metrics.avgResolutionTime = Math.round(totalResolutionTime / resolvedCount);
    }
    return metrics;
  }

  /** @deprecated Usar getUserMetrics() */
  public processUserMetrics(tickets: Record<string, unknown>[]): UserMetric[] {
    const porUsuario = new Map<string, UserMetric>();

    tickets.forEach(ticket => {
      const createdBy     = ticket['createdBy']     as string | undefined;
      const createdByName = ticket['createdByName'] as string | undefined;
      const assignedTo    = ticket['assignedTo']    as string | undefined;
      const assignedName  = ticket['assignedToName'] as string | undefined;
      const status        = (ticket['status'] as string) || '';
      const resolvedAt    = ticket['resolvedAt'] as string | undefined;
      const createdAt     = ticket['createdAt']  as string | undefined;

      if (createdBy) {
        if (!porUsuario.has(createdBy)) {
          porUsuario.set(createdBy, {
            userId: createdBy, displayName: createdByName ?? 'Desconocido',
            ticketsCreated: 0, ticketsResolved: 0, avgResolutionTime: 0,
          });
        }
        porUsuario.get(createdBy)!.ticketsCreated++;
      }

      if (assignedTo && (status === 'resuelto' || status === 'cerrado')) {
        if (!porUsuario.has(assignedTo)) {
          porUsuario.set(assignedTo, {
            userId: assignedTo, displayName: assignedName ?? 'Desconocido',
            ticketsCreated: 0, ticketsResolved: 0, avgResolutionTime: 0,
          });
        }
        const um = porUsuario.get(assignedTo)!;
        um.ticketsResolved++;
        if (resolvedAt && createdAt) {
          const dt = (new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / 60000;
          um.avgResolutionTime = Math.round(
            (um.avgResolutionTime * (um.ticketsResolved - 1) + dt) / um.ticketsResolved,
          );
        }
      }
    });

    return Array.from(porUsuario.values());
  }

  /** @deprecated Usar getDepartmentMetrics() */
  public processDepartmentMetrics(tickets: Record<string, unknown>[]): DepartmentMetric[] {
    const porDepto = new Map<string, DepartmentMetric & {
      ticketsByCategory: Record<string, number>;
      ticketsByPriority: Record<string, number>;
    }>();

    tickets.forEach(ticket => {
      const department = (ticket['department'] as string) || 'Sin departamento';
      const status     = (ticket['status']     as string) || '';
      const category   = (ticket['category']   as string) || 'otro';
      const priority   = (ticket['priority']   as string) || 'media';
      const resolvedAt = ticket['resolvedAt']  as string | undefined;
      const createdAt  = ticket['createdAt']   as string | undefined;

      if (!porDepto.has(department)) {
        porDepto.set(department, {
          department, ticketsCount: 0, resolvedCount: 0,
          avgResolutionTime: 0, ticketsByCategory: {}, ticketsByPriority: {},
        });
      }

      const dm = porDepto.get(department)!;
      dm.ticketsCount++;
      dm.ticketsByCategory[category] = (dm.ticketsByCategory[category] || 0) + 1;
      dm.ticketsByPriority[priority] = (dm.ticketsByPriority[priority] || 0) + 1;

      if (status === 'resuelto' || status === 'cerrado') {
        dm.resolvedCount++;
        if (resolvedAt && createdAt) {
          const dt = (new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / 60000;
          dm.avgResolutionTime = Math.round(
            (dm.avgResolutionTime * (dm.resolvedCount - 1) + dt) / dm.resolvedCount,
          );
        }
      }
    });

    return Array.from(porDepto.values());
  }

  public processTimeSeriesData(tickets: Record<string, unknown>[], interval: 'day' | 'week' | 'month'): TimeSeriesData {
    const creadoMap   = new Map<string, number>();
    const resueltaMap = new Map<string, number>();

    tickets.forEach(ticket => {
      const createdAt  = ticket['createdAt']  as string | undefined;
      const resolvedAt = ticket['resolvedAt'] as string | undefined;
      const status     = (ticket['status'] as string) || '';

      if (createdAt) {
        const clave = this.claveFecha(new Date(createdAt), interval);
        creadoMap.set(clave, (creadoMap.get(clave) || 0) + 1);
      }
      if (resolvedAt && (status === 'resuelto' || status === 'cerrado')) {
        const clave = this.claveFecha(new Date(resolvedAt), interval);
        resueltaMap.set(clave, (resueltaMap.get(clave) || 0) + 1);
      }
    });

    const sorter = (a: { date: string }, b: { date: string }) =>
      new Date(a.date).getTime() - new Date(b.date).getTime();

    return {
      created:  [...creadoMap.entries()].map(([date, count]) => ({ date, count })).sort(sorter),
      resolved: [...resueltaMap.entries()].map(([date, count]) => ({ date, count })).sort(sorter),
    };
  }

  // ─── Utilidades privadas ──────────────────────────────────────────────────

  private claveFecha(fecha: Date, interval: 'day' | 'week' | 'month'): string {
    const a = fecha.getFullYear();
    const m = this.pad(fecha.getMonth() + 1);
    const d = this.pad(fecha.getDate());
    if (interval === 'day')   return `${a}-${m}-${d}`;
    if (interval === 'month') return `${a}-${m}`;
    return `${a}-W${this.pad(this.semanaISO(fecha))}`;
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  private semanaISO(fecha: Date): number {
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - inicio.getTime()) / 86400000) + 1) / 7);
  }
}
