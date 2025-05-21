import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  query, 
  where, 
  orderBy,
  DocumentData,
  CollectionReference,
  Query
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { DepartmentMetric, TicketMetric, TimeSeriesData, UserMetric } from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private firestore: Firestore = inject(Firestore);
  private injector: Injector = inject(Injector);

  /**
   * Obtiene métricas generales de tickets
   */
  getTicketMetrics(startDate?: Date, endDate?: Date): Observable<TicketMetric> {
    return this.executeTicketsQuery(startDate, endDate).pipe(
      map(tickets => this.processTicketMetrics(tickets))
    );
  }

  /**
   * Obtiene métricas por usuario
   */
  getUserMetrics(startDate?: Date, endDate?: Date): Observable<UserMetric[]> {
    return this.executeTicketsQuery(startDate, endDate).pipe(
      map(tickets => this.processUserMetrics(tickets))
    );
  }

  /**
   * Obtiene métricas por departamento
   */
  getDepartmentMetrics(startDate?: Date, endDate?: Date): Observable<DepartmentMetric[]> {
    return this.executeTicketsQuery(startDate, endDate).pipe(
      map(tickets => this.processDepartmentMetrics(tickets))
    );
  }

  /**
   * Obtiene datos para series temporales
   */
  getTimeSeriesData(startDate?: Date, endDate?: Date, interval: 'day' | 'week' | 'month' = 'day'): Observable<TimeSeriesData> {
    return this.executeTicketsQuery(startDate, endDate).pipe(
      map(tickets => this.processTimeSeriesData(tickets, interval))
    );
  }

  /**
   * Ejecuta una consulta a la colección de tickets con filtros de fecha
   * Función auxiliar reutilizable para todas las consultas
   */
  public executeTicketsQuery(startDate?: Date, endDate?: Date): Observable<any[]> {
    return new Observable(subscriber => {
      console.log('Iniciando consulta a Firestore');
      const cleanup = runInInjectionContext(this.injector, () => {
        try {
          const ticketsCollection = collection(this.firestore, 'tickets');
          let ticketsQuery: Query<DocumentData> = ticketsCollection;
          
          // Ajustar formato de fecha para consultas en Firestore
          if (startDate) {
            console.log('Fecha inicio:', startDate.toISOString());
            ticketsQuery = query(ticketsQuery, where('createdAt', '>=', startDate.toISOString()));
          }
          
          if (endDate) {
            // Ajustar la fecha de fin para incluir todo el día
            const adjustedEndDate = new Date(endDate);
            adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
            adjustedEndDate.setSeconds(0, 0); // Resetear segundos y milisegundos para evitar problemas
            console.log('Fecha fin (ajustada):', adjustedEndDate.toISOString());
            ticketsQuery = query(ticketsQuery, where('createdAt', '<', adjustedEndDate.toISOString()));
          }
          
          console.log('Query creado:', ticketsQuery);
          
          const ticketsObservable = collectionData(ticketsQuery);
          console.log('collectionData ejecutado correctamente');
          
          const subscription = ticketsObservable.subscribe({
            next: (data) => {
              console.log(`Datos recibidos: ${data.length} documentos`);
              // Solo enviar los datos reales, sin generar datos aleatorios
              subscriber.next(data);
            },
            error: (err) => {
              console.error('Error en consulta Firestore:', err);
              subscriber.error(err);
            },
            complete: () => subscriber.complete()
          });
          
          // Garantizamos limpieza correcta cuando se desuscriban
          return () => {
            subscription.unsubscribe();
          };
        } catch (error) {
          console.error('Error al ejecutar consulta:', error);
          subscriber.error(error);
          // Aseguramos que también se devuelve una función de limpieza en caso de error
          return () => {};
        }
      });

      // Devolvemos la función de limpieza cuando se desubscribe el observable
      return cleanup;
    });
  }

  /**
   * Procesa los datos brutos de tickets para generar métricas generales
   */
  public processTicketMetrics(tickets: any[]): TicketMetric {
    console.log('Procesando datos de tickets:', tickets);
    
    const metrics: TicketMetric = {
      totalTickets: tickets.length,
      openTickets: 0,
      resolvedTickets: 0,
      avgResolutionTime: 0,
      ticketsByStatus: {},
      ticketsByPriority: {},
      ticketsByCategory: {},
      ticketsByDepartment: {},
      resolvedOnTime: 0,
      resolvedLate: 0
    };

    // Si no hay tickets, devolver los valores por defecto
    if (tickets.length === 0) {
      return metrics;
    }

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    tickets.forEach(ticket => {
      // Usar valores por defecto si no están definidos
      const status = ticket.status || 'nuevo';
      const priority = ticket.priority || 'media';
      const category = ticket.category || 'otro';
      const department = ticket.department || 'Sin departamento';
      
      // Contar por estado
      metrics.ticketsByStatus[status] = (metrics.ticketsByStatus[status] || 0) + 1;
      
      // Contar por prioridad
      metrics.ticketsByPriority[priority] = (metrics.ticketsByPriority[priority] || 0) + 1;
      
      // Contar por categoría
      metrics.ticketsByCategory[category] = (metrics.ticketsByCategory[category] || 0) + 1;
      
      // Contar por departamento
      metrics.ticketsByDepartment[department] = (metrics.ticketsByDepartment[department] || 0) + 1;

      // Calcular tiempo de resolución para tickets resueltos o cerrados
      if (ticket.status === 'resuelto' || ticket.status === 'cerrado') {
        metrics.resolvedTickets++;

        if (ticket.resolvedAt && ticket.createdAt) {
          const resolvedDate = new Date(ticket.resolvedAt);
          const createdDate = new Date(ticket.createdAt);

          const resolutionTime = (resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60); // en minutos
          totalResolutionTime += resolutionTime;
          resolvedCount++;

          // Determinar si se resolvió dentro del SLA
          let targetTime;
          switch (ticket.priority) {
            case 'critica': targetTime = 4 * 60; break; // 4 horas
            case 'alta': targetTime = 8 * 60; break; // 8 horas
            case 'media': targetTime = 24 * 60; break; // 24 horas
            default: targetTime = 48 * 60; break; // 48 horas (2 días)
          }

          if (resolutionTime <= targetTime) {
            metrics.resolvedOnTime++;
          } else {
            metrics.resolvedLate++;
          }
        }
      } else {
        metrics.openTickets++;
      }
    });

    // Calcular tiempo promedio de resolución
    if (resolvedCount > 0) {
      metrics.avgResolutionTime = Math.round(totalResolutionTime / resolvedCount);
    }

    return metrics;
  }

  /**
   * Procesa los datos brutos de tickets para generar métricas por usuario
   */
  public processUserMetrics(tickets: any[]): UserMetric[] {
    const userMetrics = new Map<string, UserMetric>();

    tickets.forEach(ticket => {
      // Procesar usuario creador
      if (ticket.createdBy) {
        if (!userMetrics.has(ticket.createdBy)) {
          userMetrics.set(ticket.createdBy, {
            userId: ticket.createdBy,
            displayName: ticket.createdByName || 'Desconocido',
            ticketsCreated: 0,
            ticketsResolved: 0,
            avgResolutionTime: 0
          });
        }

        const userMetric = userMetrics.get(ticket.createdBy)!;
        userMetric.ticketsCreated++;
      }

      // Procesar usuario asignado
      if (ticket.assignedTo && (ticket.status === 'resuelto' || ticket.status === 'cerrado')) {
        if (!userMetrics.has(ticket.assignedTo)) {
          userMetrics.set(ticket.assignedTo, {
            userId: ticket.assignedTo,
            displayName: ticket.assignedToName || 'Desconocido',
            ticketsCreated: 0,
            ticketsResolved: 0,
            avgResolutionTime: 0
          });
        }

        const userMetric = userMetrics.get(ticket.assignedTo)!;
        userMetric.ticketsResolved++;

        if (ticket.resolvedAt && ticket.createdAt) {
          const createdDate = new Date(ticket.createdAt);
          const resolvedDate = new Date(ticket.resolvedAt);
          const resolutionTime = (resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60); // en minutos

          // Actualizar tiempo promedio
          const totalResolutionTime = userMetric.avgResolutionTime * (userMetric.ticketsResolved - 1) + resolutionTime;
          userMetric.avgResolutionTime = Math.round(totalResolutionTime / userMetric.ticketsResolved);
        }
      }
    });

    return Array.from(userMetrics.values());
  }

  /**
   * Procesa los datos brutos de tickets para generar métricas por departamento
   */
  public processDepartmentMetrics(tickets: any[]): DepartmentMetric[] {
    const departmentMetrics = new Map<string, DepartmentMetric>();

    tickets.forEach(ticket => {
      const department = ticket.department || 'Sin departamento';

      if (!departmentMetrics.has(department)) {
        departmentMetrics.set(department, {
          department,
          ticketsCount: 0,
          resolvedCount: 0,
          avgResolutionTime: 0,
          ticketsByCategory: {},
          ticketsByPriority: {}
        });
      }

      const deptMetric = departmentMetrics.get(department)!;
      deptMetric.ticketsCount++;

      // Contar por categoría
      const category = ticket.category;
      deptMetric.ticketsByCategory![category] = (deptMetric.ticketsByCategory![category] || 0) + 1;

      // Contar por prioridad
      const priority = ticket.priority;
      deptMetric.ticketsByPriority![priority] = (deptMetric.ticketsByPriority![priority] || 0) + 1;

      // Procesar tickets resueltos
      if (ticket.status === 'resuelto' || ticket.status === 'cerrado') {
        deptMetric.resolvedCount++;

        if (ticket.resolvedAt && ticket.createdAt) {
          const resolvedDate = new Date(ticket.resolvedAt);
          const createdDate = new Date(ticket.createdAt);
          const resolutionTime = (resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60); // en minutos

          // Actualizar tiempo promedio
          const totalResolutionTime = deptMetric.avgResolutionTime * (deptMetric.resolvedCount - 1) + resolutionTime;
          deptMetric.avgResolutionTime = Math.round(totalResolutionTime / deptMetric.resolvedCount);
        }
      }
    });

    return Array.from(departmentMetrics.values());
  }

  /**
   * Procesa los datos brutos de tickets para generar datos de series temporales
   */
  public processTimeSeriesData(tickets: any[], interval: 'day' | 'week' | 'month'): TimeSeriesData {
    const timeSeriesData: TimeSeriesData = {
      created: [],
      resolved: []
    };

    const createdMap = new Map<string, number>();
    const resolvedMap = new Map<string, number>();

    tickets.forEach(ticket => {
      // Procesar fecha de creación
      if (ticket.createdAt) {
        const createdDate = new Date(ticket.createdAt);
        const dateKey = this.getDateKey(createdDate, interval);
        createdMap.set(dateKey, (createdMap.get(dateKey) || 0) + 1);
      }

      // Procesar fecha de resolución
      if (ticket.resolvedAt && (ticket.status === 'resuelto' || ticket.status === 'cerrado')) {
        const resolvedDate = new Date(ticket.resolvedAt);
        const dateKey = this.getDateKey(resolvedDate, interval);
        resolvedMap.set(dateKey, (resolvedMap.get(dateKey) || 0) + 1);
      }
    });

    // Convertir mapas a arrays para la respuesta
    for (const [date, count] of createdMap.entries()) {
      timeSeriesData.created.push({ date, count });
    }

    for (const [date, count] of resolvedMap.entries()) {
      timeSeriesData.resolved.push({ date, count });
    }

    // Ordenar por fecha
    timeSeriesData.created.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    timeSeriesData.resolved.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return timeSeriesData;
  }

  /**
   * Genera una clave de fecha según el intervalo especificado
   */
  private getDateKey(date: Date, interval: 'day' | 'week' | 'month'): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (interval === 'day') {
      return `${year}-${this.padNumber(month)}-${this.padNumber(day)}`;
    } else if (interval === 'week') {
      const weekNumber = this.getISOWeek(date);
      return `${year}-W${this.padNumber(weekNumber)}`;
    } else {
      return `${year}-${this.padNumber(month)}`;
    }
  }

  /**
   * Añade ceros a la izquierda para números menores de 10
   */
  private padNumber(num: number): string {
    return num.toString().padStart(2, '0');
  }

  /**
   * Calcula el número de semana ISO
   */
  private getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}
