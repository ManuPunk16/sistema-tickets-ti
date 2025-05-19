import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TicketService } from '../../../../core/services/ticket.service';
import { Ticket, TicketStatus } from '../../../../core/models/ticket.model';
import { AuthService } from '../../../../core/services/auth.service';
import { Observable, combineLatest, map, startWith, switchMap, tap } from 'rxjs';
import { FormControl } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
export class TicketListComponent implements OnInit {
  tickets$: Observable<Ticket[]>;
  filteredTickets: Ticket[] = [];
  loading = true;

  // Filtros
  statusFilter = new FormControl<TicketStatus | 'todos'>('todos');
  searchControl = new FormControl('');
  departmentFilter = new FormControl<string | 'todos'>('todos');

  displayedColumns: string[] = ['id', 'title', 'status', 'priority', 'department', 'createdAt', 'assignedTo', 'actions'];

  // Paginación
  pageSize = 10;
  currentPage = 0;
  totalItems = 0;

  // Lista de departamentos (obtener de base de datos en implementación real)
  departments = [
    'Sistemas', 'Contabilidad', 'Recursos Humanos', 'Ventas', 'Marketing', 'Operaciones'
  ];

  constructor(
    private ticketService: TicketService,
    private authService: AuthService
  ) {
    // Implementa la lógica para obtener tickets
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
  }

  ngOnInit(): void {
    // Combina los cambios de filtro para actualizar la lista
    combineLatest([
      this.tickets$,
      this.statusFilter.valueChanges.pipe(startWith('todos')),
      this.searchControl.valueChanges.pipe(startWith('')),
      this.departmentFilter.valueChanges.pipe(startWith('todos'))
    ]).pipe(
      map(([tickets, status, search, department]) => {
        this.loading = false;
        let filteredTickets = [...tickets];

        // Filtrar por estado
        if (status && status !== 'todos') {
          filteredTickets = filteredTickets.filter(ticket => ticket.status === status);
        }

        // Filtrar por departamento
        if (department && department !== 'todos') {
          filteredTickets = filteredTickets.filter(ticket => ticket.department === department);
        }

        // Filtrar por búsqueda
        if (search) {
          const searchLower = search.toLowerCase();
          filteredTickets = filteredTickets.filter(ticket =>
            ticket.title.toLowerCase().includes(searchLower) ||
            ticket.description.toLowerCase().includes(searchLower) ||
            ticket.id.toLowerCase().includes(searchLower)
          );
        }

        // Actualizar total para paginación
        this.totalItems = filteredTickets.length;

        return filteredTickets;
      }),
      tap(tickets => {
        // Aplicar paginación en memoria
        this.filteredTickets = this.paginate(tickets, this.currentPage, this.pageSize);
      })
    ).subscribe();
  }

  paginate(array: any[], pageIndex: number, pageSize: number): any[] {
    const startIndex = pageIndex * pageSize;
    return array.slice(startIndex, startIndex + pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;

    // Reaplica la paginación
    combineLatest([
      this.tickets$,
      this.statusFilter.valueChanges.pipe(startWith(this.statusFilter.value)),
      this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)),
      this.departmentFilter.valueChanges.pipe(startWith(this.departmentFilter.value))
    ]).pipe(
      map(([tickets, status, search, department]) => {
        let filteredTickets = [...tickets];

        if (status && status !== 'todos') {
          filteredTickets = filteredTickets.filter(ticket => ticket.status === status);
        }

        if (department && department !== 'todos') {
          filteredTickets = filteredTickets.filter(ticket => ticket.department === department);
        }

        if (search) {
          const searchLower = search.toLowerCase();
          filteredTickets = filteredTickets.filter(ticket =>
            ticket.title.toLowerCase().includes(searchLower) ||
            ticket.description.toLowerCase().includes(searchLower) ||
            ticket.id.toLowerCase().includes(searchLower)
          );
        }

        return filteredTickets;
      }),
      tap(tickets => {
        this.filteredTickets = this.paginate(tickets, this.currentPage, this.pageSize);
      })
    ).subscribe();
  }

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

  getPriorityClass(priority: string): string {
    switch(priority) {
      case 'baja': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-blue-100 text-blue-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'critica': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  clearFilters(): void {
    this.statusFilter.setValue('todos');
    this.departmentFilter.setValue('todos');
    this.searchControl.setValue('');
  }
}
