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
  template: `
    <div class="p-5 bg-gray-50 min-h-screen">
      <!-- Encabezado -->
      <div class="flex items-center mb-8">
        <a [routerLink]="['/reportes']" 
           class="flex items-center justify-center h-10 w-10 rounded-full bg-white hover:bg-gray-100 border border-gray-200 shadow-sm text-gray-500 transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
        </a>
        <div class="ml-4">
          <h1 class="text-3xl font-bold text-gray-800">Reporte por Departamentos</h1>
          <p class="text-gray-600 mt-1">Análisis detallado de tickets por departamento</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl shadow-sm p-5 mb-8 border border-gray-100">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Filtros</h2>
        <form [formGroup]="filterForm" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
            <input 
              type="date" 
              formControlName="startDate"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de fin</label>
            <input 
              type="date" 
              formControlName="endDate"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <select
              formControlName="department"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
            >
              <option value="">Todos</option>
              <option *ngFor="let dept of departments" [value]="dept">{{ dept }}</option>
            </select>
          </div>

          <div class="flex items-end">
            <button 
              (click)="generateReport()"
              class="w-full px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center shadow-sm transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
              </svg>
              Generar Reporte
            </button>
          </div>
        </form>
      </div>

      <!-- Cargando -->
      <div *ngIf="loading" class="flex flex-col items-center justify-center py-16">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
        <p class="text-gray-600">Generando reporte...</p>
      </div>

      <!-- Contenido del Reporte -->
      <div *ngIf="!loading && hasData" class="space-y-6">
        <!-- KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Total Tickets -->
          <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div class="flex flex-col items-center">
              <div class="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
              </div>
              <p class="text-gray-500 font-medium mb-1">Total Tickets</p>
              <p class="text-3xl font-bold text-gray-800">{{ reportData.totalTickets }}</p>
            </div>
          </div>

          <!-- Tiempo Promedio -->
          <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div class="flex flex-col items-center">
              <div class="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                </svg>
              </div>
              <p class="text-gray-500 font-medium mb-1">Tiempo Promedio</p>
              <p class="text-3xl font-bold text-gray-800">{{ formatTime(reportData.avgResolutionTime) }}</p>
            </div>
          </div>

          <!-- Tasa de Resolución -->
          <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div class="flex flex-col items-center">
              <div class="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <p class="text-gray-500 font-medium mb-1">Tasa de Resolución</p>
              <p class="text-3xl font-bold text-gray-800">{{ reportData.resolutionRate }}%</p>
            </div>
          </div>
        </div>

        <!-- Tabla de departamentos -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="p-5 border-b border-gray-100">
            <h2 class="text-lg font-semibold text-gray-800">Estadísticas por Departamento</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Porcentaje</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiempo Promedio</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasa de Resolución</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let item of reportData.departmentStats">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.department }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.ticketCount }}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <span class="text-sm text-gray-500 mr-2">{{ item.percentage }}%</span>
                      <div class="w-24 bg-gray-200 rounded-full h-2">
                        <div class="h-2 rounded-full bg-indigo-500" [style.width.%]="item.percentage"></div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatTime(item.avgResolutionTime) }}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full"
                          [ngClass]="{
                            'bg-red-100 text-red-800': item.resolutionRate < 75,
                            'bg-yellow-100 text-yellow-800': item.resolutionRate >= 75 && item.resolutionRate < 90,
                            'bg-green-100 text-green-800': item.resolutionRate >= 90
                          }">
                      {{ item.resolutionRate }}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tabla de tipos de problemas -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="p-5 border-b border-gray-100">
            <h2 class="text-lg font-semibold text-gray-800">Tipos de Problemas por Departamento</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problema más común</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ocurrencias</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiempo promedio</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let item of reportData.issueTypes">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.department }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.mostCommonIssue }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.occurrences }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatTime(item.avgTimeToResolve) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- No hay datos -->
      <div *ngIf="!loading && !hasData" class="bg-white rounded-xl shadow-sm p-10 text-center border border-gray-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="text-xl font-medium text-gray-700 mb-2">No hay datos para mostrar</h3>
        <p class="text-gray-500">Ajusta los filtros y genera el reporte nuevamente</p>
      </div>
    </div>
  `,
  styles: []
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
  
  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
