import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../../../core/services/report.service';
import { DepartmentService } from '../../../../core/services/department.service';
import { Subject, takeUntil, finalize, catchError, of, forkJoin, map } from 'rxjs';
import { DepartmentMetric } from '../../../../core/models/report.model';

interface DepartmentReport {
  totalTickets: number;
  avgResolutionTime: number;
  resolutionRate: number;
  departmentStats: DepartmentStat[];
  issueTypes: IssueStat[];
}

interface DepartmentStat {
  department: string;
  ticketCount: number;
  percentage: number;
  avgResolutionTime: number;
  resolutionRate: number;
}

interface IssueStat {
  department: string;
  mostCommonIssue: string;
  occurrences: number;
  avgTimeToResolve: number;
}

@Component({
  selector: 'app-department-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './department-report.component.html',
  styleUrls: ['./department-report.component.scss']
})
export class DepartmentReportComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  loading = false;
  hasData = false;
  departments: string[] = [];
  reportData: DepartmentReport = {
    totalTickets: 0,
    avgResolutionTime: 0,
    resolutionRate: 0,
    departmentStats: [],
    issueTypes: []
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private departmentService: DepartmentService
  ) {
    // Fechas por defecto para el filtro
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    this.filterForm = this.fb.group({
      startDate: [this.formatDateForInput(thirtyDaysAgo)],
      endDate: [this.formatDateForInput(today)],
      department: ['']
    });
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDepartments(): void {
    this.departmentService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (depts) => {
          this.departments = depts;
        },
        error: (error) => {
          console.error('Error cargando departamentos:', error);
        }
      });
  }

  generateReport(): void {
    this.loading = true;
    this.hasData = false;
    
    const filters = this.filterForm.value;
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    
    console.log(`Generando reporte con fechas: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    
    // Filtro por departamento si se ha seleccionado uno
    const selectedDepartment = filters.department || null;
    
    // Usar una única consulta y procesarla para ambos tipos de datos
    this.reportService.executeTicketsQuery(startDate, endDate)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error generando informe de departamentos:', error);
          this.loading = false;
          this.hasData = false;
          return of([]);
        }),
        map(tickets => {
          // Procesar los mismos tickets para ambos tipos de métricas
          const departmentMetrics = this.reportService.processDepartmentMetrics(tickets);
          const ticketMetrics = this.reportService.processTicketMetrics(tickets);
          return { departmentMetrics, ticketMetrics };
        }),
        finalize(() => {
          // No establecer loading=false aquí, lo haremos en el suscriptor
        })
      )
      .subscribe({
        next: (data) => {
          try {
            console.log('Datos recibidos en generateReport:', data);
            
            // Procesar datos
            const processedData = this.processDepartmentReport(data, selectedDepartment);
            console.log('Datos después de procesamiento:', processedData);
            
            if (processedData) {
              this.reportData = processedData;
              this.hasData = true;
              
              // Imprimir datos para depuración
              console.log('Datos a mostrar en el reporte:', this.reportData);
              console.log('Estadísticas por departamento:', this.reportData.departmentStats);
              console.log('Estado de hasData:', this.hasData);
            }
          } catch (err) {
            console.error('Error en el procesamiento de datos:', err);
            this.hasData = false;
          } finally {
            this.loading = false; // Siempre quitar el loading al final
          }
        },
        error: (err) => {
          console.error('Error en la suscripción:', err);
          this.loading = false;
          this.hasData = false;
        }
      });
  }

  private processDepartmentReport(data: any, selectedDepartment: string | null): DepartmentReport {
    try {
      const { departmentMetrics, ticketMetrics } = data;
      
      console.log('Procesando datos del reporte:');
      console.log('- Métricas de departamentos:', departmentMetrics);
      console.log('- Métricas de tickets:', ticketMetrics);
      
      // Verificar si tenemos algún dato para procesar
      if (!departmentMetrics && (!ticketMetrics || !ticketMetrics.totalTickets)) {
        console.log('No hay datos para procesar');
        return {
          totalTickets: 0,
          avgResolutionTime: 0,
          resolutionRate: 0,
          departmentStats: [],
          issueTypes: []
        };
      }
      
      // Si no hay datos en las métricas de departamentos, pero hay en ticketMetrics, crear uno
      const deptMetricsArray = Array.isArray(departmentMetrics) ? [...departmentMetrics] : [];
      
      if (deptMetricsArray.length === 0 && ticketMetrics && ticketMetrics.ticketsByDepartment) {
        // Extraer los datos de ticketMetrics
        const departments = Object.keys(ticketMetrics.ticketsByDepartment || {});
        
        if (departments.length > 0) {
          // Crear departamento genérico
          departments.forEach(dept => {
            deptMetricsArray.push({
              department: dept,
              ticketsCount: ticketMetrics.ticketsByDepartment[dept] || 0,
              resolvedCount: 0,
              avgResolutionTime: 0,
              ticketsByCategory: ticketMetrics.ticketsByCategory || {},
              ticketsByPriority: ticketMetrics.ticketsByPriority || {}
            });
          });
          
          console.log('Métricas de departamento creadas:', deptMetricsArray);
        } else {
          // Si no hay departamentos en ticketsByDepartment pero hay tickets, crear uno genérico
          if (ticketMetrics.totalTickets > 0) {
            deptMetricsArray.push({
              department: "Sin clasificar",
              ticketsCount: ticketMetrics.totalTickets,
              resolvedCount: ticketMetrics.resolvedTickets || 0,
              avgResolutionTime: ticketMetrics.avgResolutionTime || 0,
              ticketsByCategory: ticketMetrics.ticketsByCategory || {},
              ticketsByPriority: ticketMetrics.ticketsByPriority || {}
            });
            console.log('Creado departamento genérico para tickets sin departamento');
          }
        }
      }
      
      // Filtrar por departamento si es necesario
      const filteredDepartmentMetrics = selectedDepartment 
        ? deptMetricsArray.filter((dept: DepartmentMetric) => dept.department === selectedDepartment)
        : deptMetricsArray;
      
      console.log('Métricas de departamentos filtradas:', filteredDepartmentMetrics);
      
      // Calcular totales - asegurar que totalTickets sea al menos 1 si hay datos
      const totalTickets = filteredDepartmentMetrics.reduce((total: number, dept: DepartmentMetric) => 
        total + dept.ticketsCount, 0) || (ticketMetrics?.totalTickets || 0);
      
      // Calcular tickets resueltos
      const totalResolved = filteredDepartmentMetrics.reduce((total: number, dept: DepartmentMetric) => 
        total + dept.resolvedCount, 0);
      
      // Tasa de resolución
      const resolutionRate = totalTickets > 0 
        ? Math.round((totalResolved / totalTickets) * 100) 
        : 0;
      
      // Tiempo promedio de resolución
      const totalResolutionTime = filteredDepartmentMetrics.reduce((total: number, dept: DepartmentMetric) => 
        total + (dept.avgResolutionTime * dept.resolvedCount), 0);
        
      const avgResolutionTime = totalResolved > 0 
        ? Math.round(totalResolutionTime / totalResolved)
        : 0;
      
      // Estadísticas por departamento
      let departmentStats: DepartmentStat[] = filteredDepartmentMetrics.map((dept: DepartmentMetric) => {
        const percentage = totalTickets > 0 
          ? Math.round((dept.ticketsCount / totalTickets) * 100)
          : 0;
        
        const deptResolutionRate = dept.ticketsCount > 0 
          ? Math.round((dept.resolvedCount / dept.ticketsCount) * 100)
          : 0;
        
        return {
          department: dept.department,
          ticketCount: dept.ticketsCount,
          percentage,
          avgResolutionTime: dept.avgResolutionTime,
          resolutionRate: deptResolutionRate
        };
      }).sort((a: { ticketCount: number; }, b: { ticketCount: number; }) => b.ticketCount - a.ticketCount);
      
      // Calcular problemas más comunes por departamento
      // Esto normalmente requeriría datos adicionales de tickets individuales
      // Para una implementación real, podríamos necesitar una consulta adicional
      const issueTypes: IssueStat[] = this.calculateMostCommonIssues(filteredDepartmentMetrics);
      
      // Al final, asegurémonos de que hay algún departamento para mostrar
      if (departmentStats.length === 0 && totalTickets > 0) {
        // Crear al menos un departamento genérico si hay tickets pero no hay stats
        departmentStats.push({
          department: "Sin clasificar",
          ticketCount: totalTickets,
          percentage: 100,
          avgResolutionTime: avgResolutionTime,
          resolutionRate: resolutionRate
        });
        
        console.log('Stats genéricas creadas para mostrar datos:', departmentStats);
      }
      
      return {
        totalTickets: totalTickets || 0,
        avgResolutionTime: avgResolutionTime || 0,
        resolutionRate: resolutionRate || 0,
        departmentStats: departmentStats || [],
        issueTypes: issueTypes || []
      };
    } catch (error) {
      console.error('Error en processDepartmentReport:', error);
      // Devolver estructura mínima si hay error
      return {
        totalTickets: 1, // Si llegamos aquí es porque hay al menos un documento
        avgResolutionTime: 0,
        resolutionRate: 0,
        departmentStats: [{
          department: "Error en procesamiento",
          ticketCount: 1,
          percentage: 100,
          avgResolutionTime: 0,
          resolutionRate: 0
        }],
        issueTypes: []
      };
    }
  }
  
  private calculateMostCommonIssues(deptMetrics: DepartmentMetric[]): IssueStat[] {
    const result: IssueStat[] = [];
    
    deptMetrics.forEach(dept => {
      // Encontrar la categoría más común
      let mostCommonCategory = '';
      let maxCount = 0;
      
      if (dept.ticketsByCategory) {
        for (const [category, count] of Object.entries(dept.ticketsByCategory)) {
          if (count > maxCount) {
            mostCommonCategory = category;
            maxCount = count;
          }
        }
      }
      
      // Si encontramos una categoría común, agregarla al resultado
      if (mostCommonCategory && maxCount > 0) {
        // El tiempo promedio de resolución es una estimación
        // En una implementación real, calcularíamos esto para cada categoría específica
        result.push({
          department: dept.department,
          mostCommonIssue: this.formatCategory(mostCommonCategory),
          occurrences: maxCount,
          avgTimeToResolve: dept.avgResolutionTime // Esto sería más específico en implementación real
        });
      }
    });
    
    return result;
  }
  
  private formatCategory(category: string): string {
    const map: {[key: string]: string} = {
      'hardware': 'Problemas de Hardware',
      'software': 'Problemas de Software',
      'access': 'Acceso a Sistemas',
      'network': 'Problemas de Red',
      'email': 'Configuración de Email',
      'printer': 'Problemas de Impresora',
      'other': 'Otros Problemas'
    };
    
    return map[category] || category;
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

  formatTimeShort(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
