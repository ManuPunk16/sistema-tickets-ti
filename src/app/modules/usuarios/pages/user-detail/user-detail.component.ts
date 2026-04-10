import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap, catchError } from 'rxjs';

import { UserService }   from '../../../../core/services/user.service';
import { TicketService } from '../../../../core/services/ticket.service';
import { AuthService }   from '../../../../core/services/auth.service';
import { UserProfile }   from '../../../../core/models/user.model';
import { Ticket }        from '../../../../core/models/ticket.model';
import {
  RolUsuario,
  ETIQUETA_ROL,
  CLASE_ROL,
} from '../../../../core/enums/roles-usuario.enum';

type TabActiva = 'creados' | 'asignados';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailComponent {
  private route         = inject(ActivatedRoute);
  private router        = inject(Router);
  private userService   = inject(UserService);
  private ticketService = inject(TicketService);
  private authService   = inject(AuthService);

  usuario         = signal<UserProfile | null>(null);
  usuarioActual   = signal<UserProfile | null>(null);
  cargando        = signal(true);
  cargandoTickets = signal(true);
  ticketsCreados  = signal<Ticket[]>([]);
  ticketsAsignados = signal<Ticket[]>([]);
  tabActiva       = signal<TabActiva>('creados');

  esAdmin  = computed(() => this.usuarioActual()?.role === RolUsuario.Admin);
  esAgente = computed(() => this.usuario()?.role === RolUsuario.Support);

  ticketsResueltos = computed(() =>
    this.ticketsAsignados().filter(t =>
      t.estado === 'resuelto' || t.estado === 'cerrado'
    ).length
  );

  tiempoPromedioResolucion = computed(() =>
    this.calcularTiempoPromedio(this.ticketsAsignados())
  );

  readonly etiquetaRol = ETIQUETA_ROL;
  readonly claseRol    = CLASE_ROL;

  constructor() {
    this.authService.getCurrentUser().subscribe(u =>
      this.usuarioActual.set(u as unknown as UserProfile)
    );

    this.route.params.pipe(
      switchMap(params => {
        const userId = params['id'];
        if (!userId) {
          this.router.navigate(['/usuarios']);
          return of(null);
        }

        return this.userService.getUserById(userId).pipe(
          catchError(() => {
            this.cargando.set(false);
            return of(null);
          })
        );
      }),
      switchMap(user => {
        this.usuario.set(user as unknown as UserProfile);
        this.cargando.set(false);

        if (!user) return of(null);

        return forkJoin({
          creados: this.ticketService.getUserTickets(user.uid),
          asignados: user.role === 'support'
            ? this.ticketService.getAssignedTickets(user.uid)
            : of([]),
        });
      })
    ).subscribe(result => {
      if (!result) return;
      this.ticketsCreados.set(result.creados);
      this.ticketsAsignados.set(result.asignados);
      this.cargandoTickets.set(false);
    });
  }

  claseEstado(status: string): string {
    const clases: Record<string, string> = {
      nuevo:      'bg-blue-100 text-blue-800',
      asignado:   'bg-purple-100 text-purple-800',
      en_proceso: 'bg-yellow-100 text-yellow-800',
      en_espera:  'bg-orange-100 text-orange-800',
      resuelto:   'bg-green-100 text-green-800',
      cerrado:    'bg-gray-100 text-gray-800',
    };
    return clases[status] ?? 'bg-gray-100 text-gray-800';
  }

  inicialUsuario(user: UserProfile): string {
    return (user.displayName || user.email || 'U')[0].toUpperCase();
  }

  formatearFecha(fechaStr?: string): string {
    if (!fechaStr) return 'N/A';
    try {
      return new Date(fechaStr).toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  private calcularTiempoPromedio(tickets: Ticket[]): string {
    const resueltos = tickets.filter(t =>
      (t.estado === 'resuelto' || t.estado === 'cerrado') && t.tiempoReal
    );
    if (!resueltos.length) return 'N/A';

    const avg = Math.round(
      resueltos.reduce((s, t) => s + (t.tiempoReal ?? 0), 0) / resueltos.length
    );

    if (avg < 60) return `${avg} min`;
    if (avg < 1440) return `${Math.floor(avg / 60)}h ${avg % 60}m`;
    return `${Math.floor(avg / 1440)}d ${Math.floor((avg % 1440) / 60)}h`;
  }
}
