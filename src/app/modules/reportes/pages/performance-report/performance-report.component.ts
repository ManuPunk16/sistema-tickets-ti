import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

import { ReportService } from '../../../../core/services/report.service';
import { UserService } from '../../../../core/services/user.service';
import { UserProfile } from '../../../../core/models/user.model';
import { Subject, takeUntil, finalize, catchError, of, forkJoin, map } from 'rxjs';

interface PerformanceData {
  resolvedTickets: number;
  avgResolutionTime: number;
  customerSatisfaction: number;
  resolutionTimes: any[];
  productivityData: any[];
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
}

@Component({
  selector: 'app-performance-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule
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
          <h1 class="text-3xl font-bold text-gray-800">Reporte de Rendimiento</h1>
          <p class="text-gray-600 mt-1">Analiza el rendimiento de los agentes de soporte</p>
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
            <label class="block text-sm font-medium text-gray-700 mb-1">Agente de soporte</label>
            <div class="relative">
              <select
                formControlName="supportAgent"
                class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
              >
                <option value="">Todos</option>
                <option *ngFor="let user of supportUsers" [value]="user.uid">
                  {{ user.displayName || user.email }}
                </option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div class="flex items-end">
            <button 
              (click)="generateReport()"
              class="w-full px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center shadow-sm transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
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
          <!-- Tickets Resueltos -->
          <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300">
            <div class="flex flex-col items-center">
              <div class="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-gray-500 font-medium mb-1">Tickets Resueltos</p>
              <p class="text-3xl font-bold text-gray-800">{{ performanceData.resolvedTickets }}</p>
            </div>
          </div>

          <!-- Tiempo Promedio -->
          <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300">
            <div class="flex flex-col items-center">
              <div class="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-gray-500 font-medium mb-1">Tiempo Promedio</p>
              <p class="text-3xl font-bold text-gray-800">{{ formatTime(performanceData.avgResolutionTime) }}</p>
            </div>
          </div>

          <!-- Satisfacción -->
          <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300">
            <div class="flex flex-col items-center">
              <div class="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-gray-500 font-medium mb-1">Satisfacción Cliente</p>
              <div class="flex items-center">
                <p class="text-3xl font-bold text-gray-800">{{ performanceData.customerSatisfaction }}%</p>
                <div class="ml-2">
                  <span class="inline-block w-3 h-3 rounded-full" 
                        [ngClass]="{'bg-green-500': performanceData.customerSatisfaction >= 90, 
                                    'bg-yellow-500': performanceData.customerSatisfaction >= 75 && performanceData.customerSatisfaction < 90,
                                    'bg-red-500': performanceData.customerSatisfaction < 75}"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pestañas para datos detallados -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="border-b border-gray-100">
            <div class="flex">
              <button 
                (click)="activeTab = 'resolution'"
                class="px-6 py-4 text-sm font-medium focus:outline-none border-b-2 transition-colors"
                [ngClass]="activeTab === 'resolution' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Tiempo de Resolución
              </button>
              <button 
                (click)="activeTab = 'productivity'"
                class="px-6 py-4 text-sm font-medium focus:outline-none border-b-2 transition-colors"
                [ngClass]="activeTab === 'productivity' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Productividad
              </button>
            </div>
          </div>

          <!-- Tab de Tiempo de Resolución -->
          <div *ngIf="activeTab === 'resolution'" class="p-5">
            <div class="overflow-x-auto">
              <table mat-table [dataSource]="performanceData.resolutionTimes" matSort class="min-w-full">
                <!-- ID Ticket Column -->
                <ng-container matColumnDef="ticketId">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                    ID Ticket 
                  </th>
                  <td mat-cell *matCellDef="let item" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                    {{ item.ticketId }}
                  </td>
                </ng-container>

                <!-- Título Column -->
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                    Título 
                  </th>
                  <td mat-cell *matCellDef="let item" class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {{ item.title }}
                  </td>
                </ng-container>

                <!-- Prioridad Column -->
                <ng-container matColumnDef="priority">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                    Prioridad 
                  </th>
                  <td mat-cell *matCellDef="let item" class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full"
                          [ngClass]="{
                            'bg-green-100 text-green-800': item.priority === 'Baja',
                            'bg-blue-100 text-blue-800': item.priority === 'Media',
                            'bg-orange-100 text-orange-800': item.priority === 'Alta',
                            'bg-red-100 text-red-800': item.priority === 'Crítica'
                          }">
                      {{ item.priority }}
                    </span>
                  </td>
                </ng-container>

                <!-- Tiempo Resolución Column -->
                <ng-container matColumnDef="resolutionTime">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                    Tiempo de Resolución 
                  </th>
                  <td mat-cell *matCellDef="let item" class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {{ formatTime(item.resolutionTime) }}
                  </td>
                </ng-container>

                <!-- Estado SLA Column -->
                <ng-container matColumnDef="slaStatus">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                    Estado SLA 
                  </th>
                  <td mat-cell *matCellDef="let item" class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full"
                          [ngClass]="item.slaCompliance ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                      {{ item.slaCompliance ? 'Cumplido' : 'Excedido' }}
                    </span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="['ticketId', 'title', 'priority', 'resolutionTime', 'slaStatus']" class="bg-gray-50"></tr>
                <tr mat-row *matRowDef="let row; columns: ['ticketId', 'title', 'priority', 'resolutionTime', 'slaStatus'];" 
                    class="hover:bg-gray-50 transition-colors duration-150 ease-in-out border-b border-gray-200"></tr>
              </table>
            </div>
          </div>

          <!-- Tab de Productividad -->
          <div *ngIf="activeTab === 'productivity'" class="p-5">
            <div class="overflow-x-auto">
              <table mat-table [dataSource]="performanceData.productivityData" matSort class="min-w-full">
                <!-- Day Column -->
                <ng-container matColumnDef="day">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                    Día 
                  </th>
                  <td mat-cell *matCellDef="let item" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                    {{ item.day }}
                  </td>
                </ng-container>

                <!-- Tickets Asignados Column -->
                <ng-container matColumnDef="ticketsAssigned">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                    Tickets Asignados 
                  </th>
                  <td mat-cell *matCellDef="let item" class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {{ item.ticketsAssigned }}
                  </td>
                </ng-container>

                <!-- Tickets Resueltos Column -->
                <ng-container matColumnDef="ticketsResolved">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                    Tickets Resueltos 
                  </th>
                  <td mat-cell *matCellDef="let item" class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {{ item.ticketsResolved }}
                  </td>
                </ng-container>

                <!-- Tiempo Promedio Column -->
                <ng-container matColumnDef="avgResponseTime">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                    Tiempo Promedio 
                  </th>
                  <td mat-cell *matCellDef="let item" class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {{ formatTime(item.avgResponseTime) }}
                  </td>
                </ng-container>

                <!-- Eficiencia Column -->
                <ng-container matColumnDef="efficiency">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                    Eficiencia 
                  </th>
                  <td mat-cell *matCellDef="let item" class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div class="h-2 rounded-full" 
                             [ngStyle]="{width: (item.ticketsResolved / item.ticketsAssigned * 100) + '%', 
                                        backgroundColor: getEfficiencyColor(item.ticketsResolved, item.ticketsAssigned)}"></div>
                      </div>
                      <span class="text-xs font-medium">{{ (item.ticketsResolved / item.ticketsAssigned * 100).toFixed(0) }}%</span>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="['day', 'ticketsAssigned', 'ticketsResolved', 'avgResponseTime', 'efficiency']" class="bg-gray-50"></tr>
                <tr mat-row *matRowDef="let row; columns: ['day', 'ticketsAssigned', 'ticketsResolved', 'avgResponseTime', 'efficiency'];" 
                    class="hover:bg-gray-50 transition-colors duration-150 ease-in-out border-b border-gray-200"></tr>
              </table>
            </div>
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
  styles: [`
    :host {
      display: block;
    }
    
    /* Estilos para las tablas de Angular Material con Tailwind */
    .mat-mdc-header-cell {
      @apply font-medium text-gray-700 bg-gray-50 py-3;
    }
    
    .mat-mdc-cell {
      @apply border-b border-gray-200 py-3;
    }
    
    tr.mat-mdc-row:hover {
      @apply bg-gray-50;
    }
  `]
})
export class PerformanceReportComponent implements OnInit, OnDestroy {
  @ViewChild('resolutionPaginator') resolutionPaginator!: MatPaginator;
  @ViewChild('productivityPaginator') productivityPaginator!: MatPaginator;
  @ViewChild('resolutionSort') resolutionSort!: MatSort;
  @ViewChild('productivitySort') productivitySort!: MatSort;

  filterForm: FormGroup;
  loading = false;
  hasData = false;
  supportUsers: UserProfile[] = [];
  activeTab = 'resolution';
  
  resolutionDataSource = new MatTableDataSource<ResolutionTimeItem>([]);
  productivityDataSource = new MatTableDataSource<ProductivityItem>([]);
  
  performanceData: PerformanceData = {
    resolvedTickets: 0,
    avgResolutionTime: 0,
    customerSatisfaction: 0,
    resolutionTimes: [],
    productivityData: []
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private userService: UserService
  ) {
    // Convertir las fechas a formato adecuado para input date
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    this.filterForm = this.fb.group({
      startDate: [this.formatDateForInput(thirtyDaysAgo)],
      endDate: [this.formatDateForInput(today)],
      supportAgent: ['']
    });
  }

  ngOnInit(): void {
    this.loadSupportUsers();
  }

  ngAfterViewInit(): void {
    if (this.resolutionPaginator && this.resolutionSort) {
      this.resolutionDataSource.paginator = this.resolutionPaginator;
      this.resolutionDataSource.sort = this.resolutionSort;
    }
    
    if (this.productivityPaginator && this.productivitySort) {
      this.productivityDataSource.paginator = this.productivityPaginator;
      this.productivityDataSource.sort = this.productivitySort;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSupportUsers(): void {
    this.userService.getUsersByRole('support')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.supportUsers = users;
        },
        error: (error) => {
          console.error('Error loading support users:', error);
        }
      });
  }

  generateReport(): void {
    this.loading = true;
    this.hasData = false;
    
    const filters = this.filterForm.value;
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    
    // Asegurarse de que la fecha de fin sea el final del día
    endDate.setHours(23, 59, 59, 999);
    
    // Búsqueda de agente específico
    const supportAgent = filters.supportAgent || null;
    
    // Combinar múltiples observables para obtener datos completos de rendimiento
    forkJoin({
      userMetrics: this.reportService.getUserMetrics(startDate, endDate),
      ticketMetrics: this.reportService.getTicketMetrics(startDate, endDate),
      timeSeriesData: this.reportService.getTimeSeriesData(startDate, endDate, 'day')
    })
    .pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error generando informe:', error);
        return of({ userMetrics: [], ticketMetrics: null, timeSeriesData: { created: [], resolved: [] } });
      }),
      finalize(() => {
        this.loading = false;
      }),
      map(data => this.processPerformanceData(data, supportAgent))
    )
    .subscribe({
      next: (data) => {
        if (data) {
          this.performanceData = data;
          this.resolutionDataSource.data = data.resolutionTimes;
          this.productivityDataSource.data = data.productivityData;
          this.hasData = data.resolvedTickets > 0;
          
          // Actualizar paginadores y ordenadores
          if (this.resolutionPaginator) this.resolutionDataSource.paginator = this.resolutionPaginator;
          if (this.resolutionSort) this.resolutionDataSource.sort = this.resolutionSort;
          if (this.productivityPaginator) this.productivityDataSource.paginator = this.productivityPaginator;
          if (this.productivitySort) this.productivityDataSource.sort = this.productivitySort;
        } else {
          this.hasData = false;
        }
      }
    });
  }

  private processPerformanceData(data: any, supportAgent: string | null): PerformanceData {
    const { userMetrics, ticketMetrics, timeSeriesData } = data;
    
    // Filtrar por agente específico si es necesario
    const filteredUserMetrics = supportAgent 
      ? userMetrics.filter((u: any) => u.userId === supportAgent)
      : userMetrics;
    
    // Calcular datos para el informe de rendimiento
    const resolvedTickets = filteredUserMetrics.reduce((total: number, user: any) => 
      total + user.ticketsResolved, 0);
    
    // Calcular tiempo promedio de resolución de todos los usuarios filtrados
    const avgResolutionTime = filteredUserMetrics.length > 0 
      ? filteredUserMetrics.reduce((total: number, user: any) => 
          total + (user.avgResolutionTime * user.ticketsResolved), 0) 
          / resolvedTickets || 0
      : 0;
    
    // Calcular satisfacción del cliente (simulado basado en SLA)
    const customerSatisfaction = ticketMetrics 
      ? Math.round((ticketMetrics.resolvedOnTime / (ticketMetrics.resolvedOnTime + ticketMetrics.resolvedLate) * 100)) || 0
      : 0;
    
    // Obtener datos detallados sobre tiempos de resolución
    // Esto requeriría datos adicionales de tickets individuales
    // Vamos a simular esto desde los datos disponibles para la demo
    const resolutionTimes = this.getResolutionTimes(data);
    
    // Generar datos de productividad diaria
    const productivityData = this.generateProductivityData(timeSeriesData, supportAgent);
    
    return {
      resolvedTickets,
      avgResolutionTime: Math.round(avgResolutionTime),
      customerSatisfaction,
      resolutionTimes,
      productivityData
    };
  }

  private getResolutionTimes(data: any): ResolutionTimeItem[] {
    // En una implementación real, obtendríamos estos datos de Firestore
    // Para una demo, los generamos a partir de información disponible
    const result: ResolutionTimeItem[] = [];
    
    // Obtener tickets reales si los tenemos
    // Esta función necesitaría ser completada con datos reales de Firebase
    // Consulta adicional para obtener detalles de los tickets si es necesario
    
    return result;
  }
  
  private generateProductivityData(timeSeriesData: any, supportAgent: string | null): ProductivityItem[] {
    // Generar datos de productividad diaria basados en series temporales
    const result: ProductivityItem[] = [];
    
    // Crear un mapa para días -> resueltos
    const resolvedByDay = new Map<string, number>();
    timeSeriesData.resolved.forEach((item: any) => {
      resolvedByDay.set(item.date, item.count);
    });
    
    // Crear un mapa para días -> creados (asignados)
    const createdByDay = new Map<string, number>();
    timeSeriesData.created.forEach((item: any) => {
      createdByDay.set(item.date, item.count);
    });
    
    // Combinar datos
    const allDates = new Set([...resolvedByDay.keys(), ...createdByDay.keys()]);
    const sortedDates = Array.from(allDates).sort();
    
    // Calcular para los últimos 7 días
    const last7Dates = sortedDates.slice(-7);
    
    last7Dates.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayName = this.getDayName(date);
      const ticketsResolved = resolvedByDay.get(dateStr) || 0;
      const ticketsAssigned = createdByDay.get(dateStr) || 0;
      
      // Tiempo de respuesta simulado (podría ser real con datos adicionales)
      // En una implementación real, esto vendría de métricas de tickets
      const avgResponseTime = ticketsResolved > 0 ? Math.floor(Math.random() * 60) + 20 : 0;
      
      result.push({
        day: dayName,
        ticketsAssigned,
        ticketsResolved,
        avgResponseTime
      });
    });
    
    return result;
  }
  
  private getDayName(date: Date): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
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

  getEfficiencyColor(resolved: number, assigned: number): string {
    if (assigned === 0) return '#6B7280'; // gray-500 para cuando no hay asignados
    
    const efficiency = (resolved / assigned) * 100;
    if (efficiency >= 90) return '#10B981'; // green-500
    if (efficiency >= 75) return '#F59E0B'; // amber-500
    return '#EF4444'; // red-500
  }
}
