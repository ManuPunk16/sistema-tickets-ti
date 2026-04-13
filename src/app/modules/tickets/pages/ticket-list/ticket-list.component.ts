import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';

import { TicketService } from '../../../../core/services/ticket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DepartmentService } from '../../../../core/services/department.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { Ticket, EstadoTicket } from '../../../../core/models/ticket.model';
import { UserProfile } from '../../../../core/models/user.model';
import { RolUsuario } from '../../../../core/enums/roles-usuario.enum';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule, DatePipe],
  templateUrl: './ticket-list.component.html',
  styleUrl: './ticket-list.component.scss'
})
export class TicketListComponent implements OnInit {
  private ticketService    = inject(TicketService);
  private authService      = inject(AuthService);
  private departmentService = inject(DepartmentService);
  private notificaciones   = inject(NotificacionService);

  // ─── Estado ───────────────────────────────────────────────────────────────
  protected tickets       = signal<Ticket[]>([]);
  protected departamentos  = signal<string[]>([]);
  protected cargando      = signal(true);
  protected usuarioActual  = signal<UserProfile | null>(null);

  // ─── Permisos derivados del rol ──────────────────────────────────────
  protected esUsuarioNormal = computed(
    () => this.usuarioActual()?.role === RolUsuario.User
  );

  // ─── Filtros ──────────────────────────────────────────────────────────────
  protected busqueda          = signal('');
  protected filtroEstado      = signal('');
  protected filtroDepartamento = signal('');
  protected filtroPrioridad   = signal('');

  // ─── Paginación ───────────────────────────────────────────────────────────
  protected paginaActual    = signal(1);
  protected itemsPorPagina  = signal(10);

  // ─── Ordenamiento ─────────────────────────────────────────────────────────
  protected columnaOrden     = signal<keyof Ticket>('createdAt');
  protected ordenAscendente  = signal(false);

  // ─── Computed ─────────────────────────────────────────────────────────────
  protected ticketsFiltrados = computed(() => {
    let resultado = [...this.tickets()];

    const busqueda   = this.busqueda().toLowerCase().trim();
    const estado     = this.filtroEstado();
    const depto      = this.filtroDepartamento();
    const prioridad  = this.filtroPrioridad();

    if (estado)    resultado = resultado.filter(t => t.estado === estado);
    if (depto)     resultado = resultado.filter(t => t.departamento === depto);
    if (prioridad) resultado = resultado.filter(t => t.prioridad === prioridad);
    if (busqueda)  resultado = resultado.filter(t =>
      t.titulo.toLowerCase().includes(busqueda) ||
      t.descripcion.toLowerCase().includes(busqueda) ||
      (t.id && t.id.toLowerCase().includes(busqueda)) ||
      (t.numero && String(t.numero).includes(busqueda))
    );

    // Ordenar
    const col = this.columnaOrden();
    resultado.sort((a, b) => {
      const valA = String(a[col] ?? '');
      const valB = String(b[col] ?? '');
      return this.ordenAscendente()
        ? valA.localeCompare(valB, 'es')
        : valB.localeCompare(valA, 'es');
    });

    return resultado;
  });

  protected totalFiltrados = computed(() => this.ticketsFiltrados().length);

  protected totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalFiltrados() / this.itemsPorPagina()))
  );

  protected ticketsPagina = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina();
    return this.ticketsFiltrados().slice(inicio, inicio + this.itemsPorPagina());
  });

  protected numeroPaginas = computed(() => {
    const total  = this.totalPaginas();
    const actual = this.paginaActual();
    const pages: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (actual > 3) pages.push('...');
      const inicio = Math.max(2, actual - 1);
      const fin    = Math.min(total - 1, actual + 1);
      for (let i = inicio; i <= fin; i++) pages.push(i);
      if (actual < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  // ─── Ciclo de vida ────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarTickets();
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────
  private cargarDepartamentos(): void {
    // Solo cargamos departamentos para admin/soporte (el filtro no aplica a usuarios normales)
    this.departmentService.getDepartments().subscribe({
      next: deptos => this.departamentos.set(deptos),
      error: () => {}
    });
  }

  private cargarTickets(): void {
    this.cargando.set(true);

    this.authService.getCurrentUser().pipe(take(1)).subscribe({
      next: usuario => {
        if (!usuario) {
          this.cargando.set(false);
          return;
        }

        // Guardar usuario para permisos de UI
        this.usuarioActual.set(usuario);

        // Cargar departamentos solo para roles que pueden filtrar por ellos
        if (usuario.role === RolUsuario.Admin || usuario.role === RolUsuario.Support) {
          this.cargarDepartamentos();
        }

        const obs$ = usuario.role === RolUsuario.Admin
          ? this.ticketService.getAllTickets()
          : usuario.role === RolUsuario.Support
            ? this.ticketService.getAssignedTickets(usuario.uid)
            : this.ticketService.getUserTickets(usuario.uid);

        obs$.subscribe({
          next:  tickets => { this.tickets.set(tickets); this.cargando.set(false); },
          error: () => {
            this.cargando.set(false);
            this.notificaciones.error('Error al cargar los tickets. Intenta de nuevo.');
          }
        });
      },
      error: () => this.cargando.set(false)
    });
  }

  // ─── Acciones de paginación ───────────────────────────────────────────────
  protected irAPagina(pagina: number | '...'): void {
    if (typeof pagina !== 'number') return;
    const total = this.totalPaginas();
    if (pagina >= 1 && pagina <= total) this.paginaActual.set(pagina);
  }

  protected cambiarItemsPorPagina(cantidad: number): void {
    this.itemsPorPagina.set(cantidad);
    this.paginaActual.set(1);
  }

  // ─── Acciones de filtros ──────────────────────────────────────────────────
  protected aplicarFiltro(): void {
    this.paginaActual.set(1);
  }

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroEstado.set('');
    this.filtroDepartamento.set('');
    this.filtroPrioridad.set('');
    this.paginaActual.set(1);
  }

  // ─── Ordenamiento ─────────────────────────────────────────────────────────
  protected ordenarPor(columna: keyof Ticket): void {
    if (this.columnaOrden() === columna) {
      this.ordenAscendente.update(v => !v);
    } else {
      this.columnaOrden.set(columna);
      this.ordenAscendente.set(true);
    }
    this.paginaActual.set(1);
  }

  // ─── Helpers de estilo ────────────────────────────────────────────────────
  protected claseEstado(estado: string): string {
    const clases: Record<string, string> = {
      nuevo:      'bg-blue-100 text-blue-800',
      asignado:   'bg-purple-100 text-purple-800',
      en_proceso: 'bg-yellow-100 text-yellow-800',
      en_espera:  'bg-orange-100 text-orange-800',
      resuelto:   'bg-green-100 text-green-800',
      cerrado:    'bg-gray-100 text-gray-800',
    };
    return clases[estado] ?? 'bg-gray-100 text-gray-800';
  }

  protected clasePrioridad(prioridad: string): string {
    const clases: Record<string, string> = {
      baja:    'bg-green-100 text-green-800',
      media:   'bg-yellow-100 text-yellow-800',
      alta:    'bg-red-100 text-red-800',
      critica: 'bg-purple-100 text-purple-800',
    };
    return clases[prioridad] ?? 'bg-gray-100 text-gray-800';
  }

  protected etiquetaEstado(estado: string): string {
    const etiquetas: Record<string, string> = {
      nuevo:      'Nuevo',
      asignado:   'Asignado',
      en_proceso: 'En proceso',
      en_espera:  'En espera',
      resuelto:   'Resuelto',
      cerrado:    'Cerrado',
    };
    return etiquetas[estado] ?? estado;
  }

  protected etiquetaPrioridad(prioridad: string): string {
    const etiquetas: Record<string, string> = {
      baja:    'Baja',
      media:   'Media',
      alta:    'Alta',
      critica: 'Crítica',
    };
    return etiquetas[prioridad] ?? prioridad;
  }

  protected iconoOrden(columna: string): string {
    if (this.columnaOrden() !== columna) return '↕';
    return this.ordenAscendente() ? '↑' : '↓';
  }

  protected esPagina(p: number | '...'): p is number {
    return typeof p === 'number';
  }
}
