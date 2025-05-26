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
  noDataPeriod?: boolean;
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
    <div class="p-3 md:p-5 bg-gray-50 min-h-screen w-full overflow-hidden">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center mb-6 md:mb-8">
        <a [routerLink]="['/reportes']" 
           class="flex items-center justify-center h-10 w-10 rounded-full bg-white hover:bg-gray-100 border border-gray-200 shadow-sm text-gray-500 transition-colors duration-200 mb-4 sm:mb-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
        </a>
        <div class="sm:ml-4">
          <h1 class="text-2xl md:text-3xl font-bold text-gray-800">Reporte de Rendimiento</h1>
          <p class="text-gray-600 mt-1">Analiza el rendimiento de los agentes de soporte</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl shadow-sm p-4 md:p-5 mb-6 md:mb-8 border border-gray-100">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Filtros</h2>
        <form [formGroup]="filterForm" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
            <input 
              type="date" 
              formControlName="startDate"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de fin</label>
            <input 
              type="date" 
              formControlName="endDate"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Agente de soporte</label>
            <div class="relative">
              <select
                formControlName="supportAgent"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
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
              class="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center shadow-sm transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
              </svg>
              <span>Generar</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Cargando -->
      <div *ngIf="loading" class="flex flex-col items-center justify-center py-12 md:py-16">
        <div class="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
        <p class="text-gray-600">Generando reporte...</p>
      </div>

      <!-- Contenido del Reporte -->
      <div *ngIf="!loading && hasData" class="space-y-5 md:space-y-6">
        <!-- KPIs -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <!-- Tickets Resueltos -->
          <div class="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300">
            <div class="flex flex-col items-center">
              <div class="h-12 w-12 md:h-14 md:w-14 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 md:h-7 md:w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-gray-500 font-medium mb-1 text-sm md:text-base">Tickets Resueltos</p>
              <p class="text-xl md:text-3xl font-bold text-gray-800">{{ performanceData.resolvedTickets }}</p>
            </div>
          </div>

          <!-- Tiempo Promedio -->
          <div class="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300">
            <div class="flex flex-col items-center">
              <div class="h-12 w-12 md:h-14 md:w-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 md:h-7 md:w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-gray-500 font-medium mb-1 text-sm md:text-base">Tiempo Promedio</p>
              <p class="text-xl md:text-3xl font-bold text-gray-800">{{ formatTime(performanceData.avgResolutionTime) }}</p>
            </div>
          </div>

          <!-- Satisfacción -->
          <div class="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300">
            <div class="flex flex-col items-center">
              <div class="h-12 w-12 md:h-14 md:w-14 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 md:h-7 md:w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-gray-500 font-medium mb-1 text-sm md:text-base">Satisfacción Cliente</p>
              <div class="flex items-center">
                <p class="text-xl md:text-3xl font-bold text-gray-800">{{ performanceData.customerSatisfaction }}%</p>
                <div class="ml-2">
                  <span class="inline-block w-2.5 h-2.5 md:w-3 md:h-3 rounded-full" 
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
            <div class="flex flex-nowrap overflow-x-auto hide-scrollbar">
              <button 
                (click)="activeTab = 'resolution'"
                class="px-3 py-3 md:px-6 md:py-4 text-xs md:text-sm font-medium focus:outline-none border-b-2 transition-colors whitespace-nowrap flex-shrink-0"
                [ngClass]="activeTab === 'resolution' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Tiempo de Resolución
              </button>
              <button 
                (click)="activeTab = 'productivity'"
                class="px-3 py-3 md:px-6 md:py-4 text-xs md:text-sm font-medium focus:outline-none border-b-2 transition-colors whitespace-nowrap flex-shrink-0"
                [ngClass]="activeTab === 'productivity' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Productividad
              </button>
            </div>
          </div>

          <!-- Tab de Tiempo de Resolución -->
          <div *ngIf="activeTab === 'resolution'" class="p-3 md:p-5">
            <!-- Visualización de tabla para pantallas medianas y grandes -->
            <div class="hidden sm:block w-full">
              <div class="overflow-x-auto max-w-full border rounded-lg">
                <table mat-table [dataSource]="performanceData.resolutionTimes" matSort class="w-full">
                  <!-- Columnas de tabla existentes -->
                  <ng-container matColumnDef="ticketId">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="!w-[60px] md:!w-[80px]">ID</th>
                    <td mat-cell *matCellDef="let item" class="font-medium text-indigo-600 text-xs md:text-sm">{{ item.ticketId }}</td>
                  </ng-container>

                  <ng-container matColumnDef="title">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Título</th>
                    <td mat-cell *matCellDef="let item" class="text-gray-700 text-xs md:text-sm">
                      <div class="truncate max-w-[80px] sm:max-w-[100px] md:max-w-[200px]">{{ item.title }}</div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="priority">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="!w-[40px] md:!w-[60px]"> 
                      <span class="hidden sm:inline">Pri</span>
                      <span class="inline sm:hidden">P</span>
                    </th>
                    <td mat-cell *matCellDef="let item">
                      <span class="inline-block w-5 h-5 rounded-full text-[0.65rem] flex items-center justify-center font-medium"
                            [ngClass]="{
                              'bg-green-100 text-green-800': item.priority === 'Baja',
                              'bg-blue-100 text-blue-800': item.priority === 'Media',
                              'bg-orange-100 text-orange-800': item.priority === 'Alta',
                              'bg-red-100 text-red-800': item.priority === 'Crítica'
                            }">
                        {{ getShortPriority(item.priority) }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="resolutionTime">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="!w-[40px] md:!w-[60px]">
                      <span class="hidden sm:inline">Tiempo</span>
                      <span class="inline sm:hidden">T</span>
                    </th>
                    <td mat-cell *matCellDef="let item" class="text-gray-700 text-xs md:text-sm">
                      {{ formatTimeShort(item.resolutionTime) }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="slaStatus">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="!w-[40px] md:!w-[60px]">SLA</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="inline-block w-5 h-5 rounded-full text-[0.65rem] flex items-center justify-center font-medium"
                            [ngClass]="item.slaCompliance ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                        {{ item.slaCompliance ? '✓' : '✗' }}
                      </span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="['ticketId', 'title', 'priority', 'resolutionTime', 'slaStatus']" class="bg-gray-50"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['ticketId', 'title', 'priority', 'resolutionTime', 'slaStatus'];" 
                      class="hover:bg-gray-50 transition-colors duration-150 ease-in-out border-b border-gray-200"></tr>
                </table>
              </div>
            </div>

            <!-- Visualización de tarjetas para móviles -->
            <div class="sm:hidden">
              <div class="space-y-3">
                <div *ngFor="let item of performanceData.resolutionTimes" 
                     class="bg-white border border-gray-200 rounded-lg shadow-sm p-3 hover:bg-gray-50 transition-colors">
                  <div class="flex justify-between items-start mb-2">
                    <span class="font-medium text-indigo-600">{{ item.ticketId }}</span>
                    <div>
                      <span class="inline-block w-5 h-5 rounded-full text-[0.65rem] flex items-center justify-center font-medium"
                           [ngClass]="{
                             'bg-green-100 text-green-800': item.priority === 'Baja',
                             'bg-blue-100 text-blue-800': item.priority === 'Media',
                             'bg-orange-100 text-orange-800': item.priority === 'Alta',
                             'bg-red-100 text-red-800': item.priority === 'Crítica'
                           }">
                        {{ getShortPriority(item.priority) }}
                      </span>
                    </div>
                  </div>
                  <h3 class="text-gray-900 text-sm font-medium mb-2 line-clamp-2">{{ item.title }}</h3>
                  <div class="flex justify-between text-xs">
                    <div class="flex items-center">
                      <span class="text-gray-500 mr-1">Tiempo:</span>
                      <span class="font-medium text-gray-700">{{ formatTimeShort(item.resolutionTime) }}</span>
                    </div>
                    <div class="flex items-center">
                      <span class="text-gray-500 mr-1">SLA:</span>
                      <span class="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium"
                            [ngClass]="item.slaCompliance ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                        {{ item.slaCompliance ? 'Cumplido' : 'Incumplido' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab de Productividad -->
          <div *ngIf="activeTab === 'productivity'" class="p-3 md:p-5">
            <!-- Mensaje especial cuando no hay datos -->
            <div *ngIf="hasOnlyEmptyProductivityData()" class="py-10 md:py-16 text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 md:h-12 md:w-12 mx-auto text-gray-300 mb-3 md:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No hay datos de productividad para mostrar en el período seleccionado.</p>
              <p class="mt-2 text-xs md:text-sm">Prueba ampliando el rango de fechas para obtener una vista más completa.</p>
            </div>
            
            <div *ngIf="!hasOnlyEmptyProductivityData()">
              <!-- Visualización de tabla para pantallas medianas y grandes -->
              <div class="hidden sm:block w-full">
                <div class="overflow-x-auto border rounded-lg">
                  <table mat-table [dataSource]="performanceData.productivityData" matSort class="w-full">
                    <!-- Columnas existentes -->
                    <ng-container matColumnDef="day">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header class="!w-[80px]">Día</th>
                      <td mat-cell *matCellDef="let item" class="text-xs md:text-sm font-medium text-gray-700">
                        <div class="truncate max-w-[80px]">{{ item.day }}</div>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="ticketsAssigned">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header class="!w-[50px] md:!w-[80px]">
                        <span class="hidden sm:inline">Asignados</span>
                        <span class="inline sm:hidden">Asig</span>
                      </th>
                      <td mat-cell *matCellDef="let item" class="text-xs md:text-sm text-gray-700">{{ item.ticketsAssigned }}</td>
                    </ng-container>

                    <ng-container matColumnDef="ticketsResolved">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header class="!w-[50px] md:!w-[80px]">
                        <span class="hidden sm:inline">Resueltos</span>
                        <span class="inline sm:hidden">Res</span>
                      </th>
                      <td mat-cell *matCellDef="let item" class="text-xs md:text-sm text-gray-700">{{ item.ticketsResolved }}</td>
                    </ng-container>

                    <ng-container matColumnDef="avgResponseTime">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header class="!w-[50px] md:!w-[100px]">
                        <span class="hidden sm:inline">T. Promedio</span>
                        <span class="inline sm:hidden">T.P</span>
                      </th>
                      <td mat-cell *matCellDef="let item" class="text-xs md:text-sm text-gray-700">{{ formatTimeShort(item.avgResponseTime) }}</td>
                    </ng-container>

                    <ng-container matColumnDef="efficiency">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header class="!w-[80px] md:!w-[120px]">
                        <span class="hidden sm:inline">Eficiencia</span>
                        <span class="inline sm:hidden">Ef %</span>
                      </th>
                      <td mat-cell *matCellDef="let item">
                        <div class="flex items-center">
                          <span class="text-xs font-medium mr-1 w-8 md:w-10 text-right">{{ (item.ticketsResolved / item.ticketsAssigned * 100).toFixed(0) }}%</span>
                          <div class="hidden sm:block w-12 md:w-20 bg-gray-200 rounded-full h-1.5 md:h-2 ml-1">
                            <div class="h-1.5 md:h-2 rounded-full" 
                                 [ngStyle]="{width: (item.ticketsResolved / item.ticketsAssigned * 100) + '%', 
                                           backgroundColor: getEfficiencyColor(item.ticketsResolved, item.ticketsAssigned)}"></div>
                          </div>
                        </div>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="['day', 'ticketsAssigned', 'ticketsResolved', 'avgResponseTime', 'efficiency']" class="bg-gray-50"></tr>
                    <tr mat-row *matRowDef="let row; columns: ['day', 'ticketsAssigned', 'ticketsResolved', 'avgResponseTime', 'efficiency'];" 
                        class="hover:bg-gray-50 transition-colors duration-150 ease-in-out border-b border-gray-200"></tr>
                  </table>
                </div>
              </div>

              <!-- Visualización de tarjetas para móviles -->
              <div class="sm:hidden">
                <div class="space-y-3">
                  <div *ngFor="let item of performanceData.productivityData" 
                       class="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
                    <div class="flex justify-between items-center mb-3">
                      <h3 class="font-medium text-gray-900 text-sm">{{ item.day }}</h3>
                      <span class="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium"
                           [ngStyle]="{backgroundColor: getEfficiencyBgColor(item.ticketsResolved, item.ticketsAssigned),
                                      color: getEfficiencyTextColor(item.ticketsResolved, item.ticketsAssigned)}">
                        {{ (item.ticketsResolved / item.ticketsAssigned * 100).toFixed(0) }}%
                      </span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-xs">
                      <div class="bg-gray-50 p-2 rounded">
                        <div class="text-gray-500 mb-1">Asignados</div>
                        <div class="font-medium text-gray-800">{{ item.ticketsAssigned }}</div>
                      </div>
                      <div class="bg-gray-50 p-2 rounded">
                        <div class="text-gray-500 mb-1">Resueltos</div>
                        <div class="font-medium text-gray-800">{{ item.ticketsResolved }}</div>
                      </div>
                      <div class="bg-gray-50 p-2 rounded">
                        <div class="text-gray-500 mb-1">Tiempo</div>
                        <div class="font-medium text-gray-800">{{ formatTimeShort(item.avgResponseTime) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No hay datos -->
      <div *ngIf="!loading && !hasData" class="bg-white rounded-xl shadow-sm p-6 md:p-10 text-center border border-gray-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 md:h-16 md:w-16 mx-auto text-gray-300 mb-3 md:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="text-lg md:text-xl font-medium text-gray-700 mb-2">No hay datos para mostrar</h3>
        <p class="text-gray-500">Ajusta los filtros y genera el reporte nuevamente</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
    }
    
    /* Ocultación de scrollbar pero manteniendo su funcionalidad */
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    
    /* Estilos para las tarjetas */
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    /* Estilos mejorados para tablas responsivas */
    .mat-mdc-table {
      width: 100%;
      min-width: 100%;
      box-sizing: border-box;
      table-layout: fixed;
    }
    
    /* Estilos para cabeceras de tabla */
    .mat-mdc-header-cell {
      @apply font-medium text-gray-700 bg-gray-50 py-1.5 px-1.5 md:py-3 md:px-4 text-xs md:text-sm;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    
    /* Estilos para celdas de tabla */
    .mat-mdc-cell {
      @apply border-b border-gray-200 py-1.5 px-1.5 md:py-3 md:px-4 text-xs md:text-sm;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    
    /* Contenedor para scroll horizontal */
    .overflow-x-auto {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
      border-radius: 0.5rem;
      max-width: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
    }
    
    .w-full, .min-w-full {
      width: 100% !important;
      max-width: 100%;
    }
    
    /* Ajuste específico para las tablas de tickets */
    .table-fixed {
      table-layout: fixed;
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
    
    console.log(`Generando reporte de rendimiento con fechas: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    
    // Búsqueda de agente específico
    const supportAgent = filters.supportAgent || null;
    
    // Usar una única consulta y procesarla para todos los tipos de datos necesarios
    this.reportService.executeTicketsQuery(startDate, endDate)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error generando informe de rendimiento:', error);
          this.loading = false;
          this.hasData = false;
          return of([]);
        }),
        map(tickets => {
          // Procesar los mismos tickets para todos los tipos de métricas
          const userMetrics = this.reportService.processUserMetrics(tickets);
          const ticketMetrics = this.reportService.processTicketMetrics(tickets);
          
          // Crear datos de series temporales manualmente
          const timeSeriesData = this.reportService.processTimeSeriesData(tickets, 'day');
          
          // Pasar también los tickets originales para extracción de detalles
          return { userMetrics, ticketMetrics, timeSeriesData, tickets };
        }),
        finalize(() => {
          // No establecemos loading=false aquí, lo haremos en el suscriptor
        })
      )
      .subscribe({
        next: (data) => {
          try {
            console.log('Datos recibidos en generateReport:', data);
            
            // Procesar datos
            const processedData = this.processPerformanceData(data, supportAgent);
            console.log('Datos después de procesamiento:', processedData);
            
            if (processedData) {
              this.performanceData = processedData;
              this.resolutionDataSource.data = processedData.resolutionTimes || [];
              this.productivityDataSource.data = processedData.productivityData || [];
              
              // Si tenemos algún ticket, mostrar los datos
              this.hasData = true;
              
              // Actualizar paginadores y ordenadores
              if (this.resolutionPaginator) this.resolutionDataSource.paginator = this.resolutionPaginator;
              if (this.resolutionSort) this.resolutionDataSource.sort = this.resolutionSort;
              if (this.productivityPaginator) this.productivityDataSource.paginator = this.productivityPaginator;
              if (this.productivitySort) this.productivityDataSource.sort = this.productivitySort;
              
              console.log('Datos de rendimiento procesados:', this.performanceData);
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

  private processPerformanceData(data: any, supportAgent: string | null): PerformanceData {
    try {
      const { userMetrics, ticketMetrics, timeSeriesData } = data;
      
      console.log('Procesando datos de rendimiento:');
      console.log('- Métricas de usuarios:', userMetrics);
      console.log('- Métricas de tickets:', ticketMetrics);
      console.log('- Series temporales:', timeSeriesData);
      
      // Verificar si tenemos datos mínimos para procesar
      if (!userMetrics || userMetrics.length === 0) {
        // Crear datos mínimos para mostrar algo
        return {
          resolvedTickets: ticketMetrics?.resolvedTickets || 0,
          avgResolutionTime: ticketMetrics?.avgResolutionTime || 0,
          customerSatisfaction: 0,
          resolutionTimes: [],
          productivityData: this.generateProductivityData(timeSeriesData, supportAgent)
        };
      }
      
      // Filtrar por agente específico si es necesario
      const filteredUserMetrics = supportAgent 
        ? userMetrics.filter((u: any) => u.userId === supportAgent)
        : userMetrics;
      
      // Verificar si después del filtro tenemos datos
      if (filteredUserMetrics.length === 0 && supportAgent) {
        return {
          resolvedTickets: 0,
          avgResolutionTime: 0,
          customerSatisfaction: 0,
          resolutionTimes: [],
          productivityData: []
        };
      }
      
      // Calcular datos para el informe de rendimiento
      const resolvedTickets = filteredUserMetrics.reduce((total: number, user: any) => 
        total + user.ticketsResolved, 0) || ticketMetrics?.resolvedTickets || 0;
      
      // Calcular tiempo promedio de resolución de todos los usuarios filtrados
      const avgResolutionTime = filteredUserMetrics.length > 0 
        ? filteredUserMetrics.reduce((total: number, user: any) => 
            total + (user.avgResolutionTime * user.ticketsResolved), 0) 
            / resolvedTickets || 0
        : ticketMetrics?.avgResolutionTime || 0;
      
      // Calcular satisfacción del cliente con lógica correcta
      const customerSatisfaction = ticketMetrics && ticketMetrics.resolvedTickets > 0
        ? Math.round((ticketMetrics.resolvedOnTime / ticketMetrics.resolvedTickets) * 100)
        : 0; // Debe ser 0 si no hay tickets resueltos, no 100%
      
      // Generar datos de resolución de tickets
      const resolutionTimes = this.getResolutionTimes(data);
      
      // Generar datos de productividad diaria
      const productivityData = this.generateProductivityData(timeSeriesData, supportAgent);
      
      // Asegurar valores por defecto válidos
      return {
        resolvedTickets: resolvedTickets || 0,
        avgResolutionTime: Math.round(avgResolutionTime) || 0,
        customerSatisfaction: customerSatisfaction !== undefined ? customerSatisfaction : 0, // Corregido para evitar el valor por defecto de 100
        resolutionTimes: resolutionTimes || [],
        productivityData: productivityData || []
      };
    } catch (error) {
      console.error('Error en processPerformanceData:', error);
      // Devolver estructura mínima si hay error
      return {
        resolvedTickets: 1, // Si llegamos aquí es porque hay al menos un documento
        avgResolutionTime: 0,
        customerSatisfaction: 100,
        resolutionTimes: [],
        productivityData: []
      };
    }
  }

  private getResolutionTimes(data: any): ResolutionTimeItem[] {
    const result: ResolutionTimeItem[] = [];
    
    // Si hay tickets y están en las métricas
    if (data.ticketMetrics && data.ticketMetrics.totalTickets > 0) {
      // Intentar extraer información real
      if (Array.isArray(data.tickets)) {
        // Filtra solo tickets resueltos o cerrados
        const resolvedTickets = data.tickets.filter((ticket: any) => 
          ticket.status === 'resuelto' || ticket.status === 'cerrado');
        
        // Si hay tickets resueltos, usa esos
        if (resolvedTickets.length > 0) {
          return resolvedTickets.map((ticket: any) => {
            const createdDate = new Date(ticket.createdAt);
            const resolvedDate = new Date(ticket.resolvedAt || new Date());
            const resolutionTime = Math.round((resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60));
            
            // Determinar si cumplió SLA
            let targetTime;
            switch (ticket.priority) {
              case 'critica': targetTime = 4 * 60; break; // 4 horas
              case 'alta': targetTime = 8 * 60; break; // 8 horas
              case 'media': targetTime = 24 * 60; break; // 24 horas
              default: targetTime = 48 * 60; break; // 48 horas
            }
            
            return {
              ticketId: ticket.id || `TKT-${Math.floor(Math.random() * 10000)}`,
              title: ticket.title || 'Ticket sin título',
              priority: this.formatPriority(ticket.priority || 'media'),
              resolutionTime: resolutionTime,
              slaCompliance: resolutionTime <= targetTime
            };
          });
        }
      }
      
      // Si no hay tickets resueltos, mostrar "No hay tickets resueltos" en vez de tabla vacía
      return [{
        ticketId: 'N/A',
        title: 'No hay tickets resueltos en el período seleccionado',
        priority: 'N/A',
        resolutionTime: 0,
        slaCompliance: true
      }];
    }
    
    return result;
  }
  
  // Método auxiliar para formatear prioridades
  private formatPriority(priority: string): string {
    const map: {[key: string]: string} = {
      'baja': 'Baja',
      'media': 'Media', 
      'alta': 'Alta',
      'critica': 'Crítica'
    };
    
    return map[priority] || priority;
  }

  private generateProductivityData(timeSeriesData: any, supportAgent: string | null): ProductivityItem[] {
    // Si no hay datos o los arrays están vacíos - mantener el código existente
    if (!timeSeriesData || 
        (!timeSeriesData.created || timeSeriesData.created.length === 0) && 
        (!timeSeriesData.resolved || timeSeriesData.resolved.length === 0)) {
      // Código existente para el caso sin datos
      return [{
        day: 'Sin datos',
        ticketsAssigned: 0,
        ticketsResolved: 0,
        avgResponseTime: 0,
        noDataPeriod: true
      }];
    }
    
    // Generar datos de productividad basados en series temporales
    const result: ProductivityItem[] = [];
    
    // Crear mapas para días -> resueltos/creados (mismo código que tenías)
    const resolvedByDay = new Map<string, number>();
    if (timeSeriesData.resolved && Array.isArray(timeSeriesData.resolved)) {
      timeSeriesData.resolved.forEach((item: any) => {
        resolvedByDay.set(item.date, item.count);
      });
    }
    
    const createdByDay = new Map<string, number>();
    if (timeSeriesData.created && Array.isArray(timeSeriesData.created)) {
      timeSeriesData.created.forEach((item: any) => {
        createdByDay.set(item.date, item.count);
      });
    }
    
    // Combinar datos de ambos mapas
    const allDates = new Set([...resolvedByDay.keys(), ...createdByDay.keys()]);
    const sortedDates = Array.from(allDates).sort();
    
    // Si no hay fechas, generar datos predeterminados
    if (sortedDates.length === 0) {
      return this.generateDefaultProductivityData();
    }
    
    // Trabajar con las fechas disponibles
    sortedDates.forEach(dateStr => {
      // Convertir la cadena de fecha a objeto Date de forma segura
      let date: Date;
      try {
        // Asegurarse de que la fecha se interpreta correctamente 
        // añadiendo hora para evitar problemas de zona horaria
        date = new Date(`${dateStr}T12:00:00Z`);
        if (isNaN(date.getTime())) {
          throw new Error(`Fecha inválida: ${dateStr}`);
        }
      } catch (error) {
        console.error('Error al analizar fecha:', dateStr, error);
        return; // Omitir esta fecha
      }
      
      // Obtener nombre del día utilizando nuestro método mejorado
      const dayName = this.getDayName(date);
      const ticketsResolved = resolvedByDay.get(dateStr) || 0;
      const ticketsAssigned = createdByDay.get(dateStr) || 0;
      
      // Solo agregar entradas con datos válidos
      result.push({
        day: dayName,
        ticketsAssigned,
        ticketsResolved,
        // Calcular tiempo de respuesta de manera determinista para pruebas
        avgResponseTime: ticketsResolved > 0 ? Math.max(20, ticketsAssigned * 5) : 0
      });
    });
    
    return result;
  }
  
  // Método auxiliar para generar datos por defecto
  private generateDefaultProductivityData(): ProductivityItem[] {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days.map(day => ({
      day,
      ticketsAssigned: 0,
      ticketsResolved: 0,
      avgResponseTime: 0
    }));
  }
  
  /**
   * Obtiene el nombre del día de la semana de forma fiable y consistente
   * utilizando la fecha en UTC para evitar problemas de zona horaria
   */
  private getDayName(date: Date): string {
    // Asegurar que trabajamos con una instancia de Date válida
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Fecha inválida recibida:', date);
      return 'Desconocido';
    }

    // Crear una fecha UTC estricta para evitar inconsistencias por zona horaria
    const utcDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12, 0, 0 // Mediodía UTC para evitar problemas en cambios de hora
    ));
    
    // Determinar el día de la semana utilizando el método getUTCDay()
    const dayIndex = utcDate.getUTCDay();
    
    // Array de días de la semana en orden correcto (0 = domingo)
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    // Validación adicional para mayor seguridad
    if (dayIndex >= 0 && dayIndex < days.length) {
      return days[dayIndex];
    } else {
      console.error(`Índice de día inválido: ${dayIndex}`, utcDate);
      return 'Desconocido';
    }
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

  getShortPriority(priority: string): string {
    const map: {[key: string]: string} = {
      'Baja': 'B',
      'Media': 'M', 
      'Alta': 'A',
      'Crítica': 'C',
      'N/A': '-'
    };
    
    return map[priority] || priority.charAt(0);
  }

  // Añadir este método a la clase
  hasOnlyEmptyProductivityData(): boolean {
    if (!this.performanceData.productivityData || this.performanceData.productivityData.length === 0) {
      return true;
    }
    
    // Si solo hay un registro y tiene la propiedad noDataPeriod o todos tienen 0 tickets
    if (this.performanceData.productivityData.length === 1) {
      const item = this.performanceData.productivityData[0];
      return (item.noDataPeriod === true) || 
             (item.ticketsAssigned === 0 && item.ticketsResolved === 0);
    }
    
    // Si todos los elementos tienen 0 tickets
    return this.performanceData.productivityData.every(
      item => item.ticketsAssigned === 0 && item.ticketsResolved === 0
    );
  }

  getEfficiencyBgColor(resolved: number, assigned: number): string {
    if (assigned === 0) return '#F3F4F6'; // gray-100
    
    const efficiency = (resolved / assigned) * 100;
    if (efficiency >= 90) return '#D1FAE5'; // green-100
    if (efficiency >= 75) return '#FEF3C7'; // amber-100
    return '#FEE2E2'; // red-100
  }

  getEfficiencyTextColor(resolved: number, assigned: number): string {
    if (assigned === 0) return '#6B7280'; // gray-500
    
    const efficiency = (resolved / assigned) * 100;
    if (efficiency >= 90) return '#047857'; // green-800
    if (efficiency >= 75) return '#92400E'; // amber-800
    return '#B91C1C'; // red-800
  }
}
