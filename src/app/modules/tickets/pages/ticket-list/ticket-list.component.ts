import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, Sort, MatSort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, Subject, combineLatest, startWith, switchMap, map, tap, takeUntil } from 'rxjs';

import { TicketService } from '../../../../core/services/ticket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DepartmentService } from '../../../../core/services/department.service';
import { Ticket, TicketStatus } from '../../../../core/models/ticket.model';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatCardModule,
    RouterLink,
    MatProgressSpinnerModule
  ],
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.scss']
})
export class TicketListComponent implements OnInit, OnDestroy {
  // Variables para DataTable
  dataSource = new MatTableDataSource<Ticket>([]);
  displayedColumns: string[] = ['id', 'title', 'status', 'priority', 'assignedTo', 'createdAt', 'actions'];
  
  // Variables para filtros 
  searchTerm = '';
  statusFilter = '';
  departmentFilter = '';

  // Estado de carga
  isLoading = true;

  // Variables para paginación
  pageSize = 10;
  totalItems = 0;

  // Datos y observables
  tickets$: Observable<Ticket[]>;
  filteredTickets: Ticket[] = [];

  // Lista de departamentos (ahora es un Observable)
  departments$: Observable<string[]>;

  // Referencias a componentes de Angular Material
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Control para gestionar suscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private departmentService: DepartmentService
  ) {
    // Inicializar observable de tickets
    this.tickets$ = this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) return [];

        if (user.role === 'admin') {
          return this.ticketService.getAllTickets();
        } else if (user.role === 'support') {
          return this.ticketService.getAssignedTickets(user.uid);
        } else {
          return this.ticketService.getUserTickets(user.uid);
        }
      })
    );
    
    // Cargar departamentos desde Firebase
    this.departments$ = this.departmentService.getDepartments();
  }

  ngOnInit(): void {
    // Cargar tickets iniciales
    this.loadTickets();
  }

  ngAfterViewInit(): void {
    // Configurar ordenamiento
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
    
    // Configurar paginador
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  ngOnDestroy(): void {
    // Cancelar todas las suscripciones al destruir el componente
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los tickets aplicando los filtros actuales
   */
  loadTickets(): void {
    this.isLoading = true;
    
    this.tickets$.pipe(
      takeUntil(this.destroy$),
      tap(() => {
        // Aplicar filtros
        this.applyFilters();
      })
    ).subscribe();
  }

  /**
   * Aplica todos los filtros seleccionados actualmente
   */
  applyFilters(): void {
    this.isLoading = true;
    
    this.tickets$.pipe(
      takeUntil(this.destroy$),
      map(tickets => {
        let filteredTickets = [...tickets];
        
        // Filtro por estado
        if (this.statusFilter) {
          filteredTickets = filteredTickets.filter(ticket => ticket.status === this.statusFilter);
        }
        
        // Filtro por departamento
        if (this.departmentFilter) {
          filteredTickets = filteredTickets.filter(ticket => ticket.department === this.departmentFilter);
        }
        
        // Filtro por término de búsqueda
        if (this.searchTerm) {
          const searchLower = this.searchTerm.toLowerCase();
          filteredTickets = filteredTickets.filter(ticket => 
            ticket.title.toLowerCase().includes(searchLower) ||
            ticket.description.toLowerCase().includes(searchLower) ||
            (ticket.id && ticket.id.toLowerCase().includes(searchLower))
          );
        }
        
        return filteredTickets;
      }),
      tap(filteredTickets => {
        // Actualizar el datasource y la información de paginación
        this.dataSource.data = filteredTickets;
        this.totalItems = filteredTickets.length;
        this.isLoading = false;
      })
    ).subscribe();
  }

  /**
   * Limpia todos los filtros aplicados
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.departmentFilter = '';
    this.applyFilters();
  }

  /**
   * Maneja el evento de cambio de página
   */
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    // No es necesario hacer nada más ya que MatPaginator maneja la paginación internamente
  }

  /**
   * Obtiene la etiqueta para mostrar el estado del ticket
   */
  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'nuevo': 'Nuevo',
      'asignado': 'Asignado',
      'en_proceso': 'En proceso',
      'en_espera': 'En espera',
      'resuelto': 'Resuelto',
      'cerrado': 'Cerrado'
    };
    
    return statusMap[status] || status;
  }

  /**
   * Obtiene la etiqueta para mostrar la prioridad del ticket
   */
  getPriorityLabel(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      'baja': 'Baja',
      'media': 'Media',
      'alta': 'Alta',
      'crítica': 'Crítica'
    };
    
    return priorityMap[priority] || priority;
  }

  /**
   * Obtiene la clase CSS para el estilo del estado
   */
  getStatusClass(status: TicketStatus): string {
    switch(status) {
      case 'nuevo': return 'bg-blue-100 text-blue-800';
      case 'asignado': return 'bg-purple-100 text-purple-800';
      case 'en_proceso': return 'bg-yellow-100 text-yellow-800';
      case 'en_espera': return 'bg-orange-100 text-orange-800';
      case 'resuelto': return 'bg-green-100 text-green-800';
      case 'cerrado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Obtiene la clase CSS para el estilo de la prioridad
   */
  getPriorityClass(priority: string): string {
    switch(priority) {
      case 'baja': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-red-100 text-red-800';
      case 'crítica': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
