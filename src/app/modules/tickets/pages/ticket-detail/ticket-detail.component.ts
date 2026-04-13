import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, switchMap, takeUntil, tap, of, filter, take, forkJoin } from 'rxjs';

import { Ticket, TicketStatus, IArchivo } from '../../../../core/models/ticket.model';
import { TicketService } from '../../../../core/services/ticket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { UserProfile } from '../../../../core/models/user.model';
import { TicketTimelineComponent } from '../../components/ticket-timeline/ticket-timeline.component';
import { TicketCommentFormComponent } from '../../components/ticket-comment-form/ticket-comment-form.component';
import { TicketCommentsListComponent } from '../../components/ticket-comments-list/ticket-comments-list.component';
import { TicketFilesComponent } from '../../components/ticket-files/ticket-files.component';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TicketTimelineComponent,
    TicketCommentFormComponent,
    TicketCommentsListComponent,
    TicketFilesComponent,
  ],
  templateUrl: './ticket-detail.component.html',
  styleUrl: './ticket-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private ticketService = inject(TicketService);
  private authService   = inject(AuthService);
  private userService   = inject(UserService);
  private fb            = inject(FormBuilder);
  private notificaciones = inject(NotificacionService);
  private destroy$ = new Subject<void>();

  // ─── Estado reactivo con Signals ──────────────────────────────────────────
  ticket         = signal<Ticket | null>(null);
  usuarioActual  = signal<UserProfile | null>(null);
  tecnicoDisponibles = signal<UserProfile[]>([]);
  cargando       = signal(true);
  actualizando   = signal(false);
  errorMensaje   = signal<string | null>(null);
  tabActivo      = signal<'comentarios' | 'timeline' | 'archivos'>('comentarios');

  // ─── Estado derivado ───────────────────────────────────────────────────────
  puedeAsignar = computed(() => {
    const u = this.usuarioActual();
    return u?.role === 'admin' || u?.role === 'support';
  });

  puedeCambiarEstado = computed(() => {
    const u = this.usuarioActual();
    const t = this.ticket();
    if (!u || !t) return false;
    if (u.role === 'admin' || u.role === 'support') return true;
    // Usuario normal solo puede cerrar un ticket PROPIO que ya esté resuelto
    return u.role === 'user' && t.creadoPorUid === u.uid && t.estado === 'resuelto';
  });

  puedeEditar = computed(() => {
    const u = this.usuarioActual();
    const t = this.ticket();
    if (!u || !t) return false;
    return (
      u.role === 'admin' ||
      t.creadoPorUid === u.uid ||
      (u.role === 'support' && t.asignadoAUid === u.uid)
    );
  });

  puedeEliminarArchivo = computed(() => {
    const u = this.usuarioActual();
    const t = this.ticket();
    if (!u || !t) return false;
    return u.role === 'admin' || u.role === 'support' || t.creadoPorUid === u.uid;
  });

  esTicketCerrado = computed(() => {
    const t = this.ticket();
    return t?.estado === 'cerrado' || t?.estado === 'resuelto';
  });

  // ─── Formularios ──────────────────────────────────────────────────────────
  statusForm = this.fb.group({
    status:     ['', Validators.required],
    statusNote: [''],
  });

  assignForm = this.fb.group({
    assignedTo: ['', Validators.required],
    assignNote: [''],
  });

  // ─── Opciones de estado ────────────────────────────────────────────────────
  readonly opcionesEstado: { value: TicketStatus; label: string }[] = [
    { value: 'nuevo',      label: 'Nuevo' },
    { value: 'asignado',   label: 'Asignado' },
    { value: 'en_proceso', label: 'En Proceso' },
    { value: 'en_espera',  label: 'En Espera' },
    { value: 'resuelto',   label: 'Resuelto' },
    { value: 'cerrado',    label: 'Cerrado' },
  ];

  // Para usuario normal solo se muestra la opción de cerrar
  opcionesEstadoDisponibles = computed(() => {
    const u = this.usuarioActual();
    if (!u || u.role === 'admin' || u.role === 'support') return this.opcionesEstado;
    return this.opcionesEstado.filter(o => o.value === 'cerrado');
  });

  // ─── Helpers de clase para badges ─────────────────────────────────────────
  claseBadgeEstado(estado: string): string {
    const mapa: Record<string, string> = {
      nuevo:      'bg-slate-100 text-slate-700 border border-slate-200',
      asignado:   'bg-blue-100 text-blue-700 border border-blue-200',
      en_proceso: 'bg-amber-100 text-amber-700 border border-amber-200',
      en_espera:  'bg-orange-100 text-orange-700 border border-orange-200',
      resuelto:   'bg-green-100 text-green-700 border border-green-200',
      cerrado:    'bg-red-100 text-red-700 border border-red-200',
    };
    return mapa[estado] ?? 'bg-slate-100 text-slate-700';
  }

  claseBadgePrioridad(prioridad: string): string {
    const mapa: Record<string, string> = {
      baja:   'bg-emerald-100 text-emerald-700 border border-emerald-200',
      media:  'bg-yellow-100 text-yellow-700 border border-yellow-200',
      alta:   'bg-rose-100 text-rose-700 border border-rose-200',
      critica:'bg-purple-100 text-purple-700 border border-purple-200',
    };
    return mapa[prioridad] ?? 'bg-slate-100 text-slate-700';
  }

  getEtiquetaEstado(estado: string): string {
    const mapa: Record<string, string> = {
      nuevo: 'Nuevo', asignado: 'Asignado', en_proceso: 'En Proceso',
      en_espera: 'En Espera', resuelto: 'Resuelto', cerrado: 'Cerrado',
    };
    return mapa[estado] ?? estado;
  }

  getEtiquetaPrioridad(prioridad: string): string {
    const mapa: Record<string, string> = {
      baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica',
    };
    return mapa[prioridad] ?? prioridad;
  }

  getIniciales(nombre: string): string {
    return nombre.split(' ').map(p => p.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  // ─── Ciclo de vida ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    // 1. Cargar usuario actual primero y esperar un valor no-null
    //    (BehaviorSubject: dispara inmediatamente si ya hay sesión activa)
    this.authService.getCurrentUser()
      .pipe(
        filter(u => u !== null),
        take(1),
        takeUntil(this.destroy$),
      )
      .subscribe(user => {
        this.usuarioActual.set(user);

        // 2. Cargar técnicos (solo admin/soporte — el endpoint los requiere)
        if (user?.role === 'admin' || user?.role === 'support') {
          forkJoin({
            admins:   this.userService.getAllUsers('admin'),
            soportes: this.userService.getAllUsers('support'),
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe(({ admins, soportes }) => {
            this.tecnicoDisponibles.set([...admins, ...soportes]);
          });
        }

        // 3. Cargar ticket DESPUÉS de tener el usuario (garantiza permisos en cargarInfoExtendida)
        this.route.data.pipe(take(1), takeUntil(this.destroy$)).subscribe(data => {
          const ticketResuelto = data['ticket'] as Ticket | null;
          if (ticketResuelto) {
            this.ticket.set(ticketResuelto);
            this.statusForm.patchValue({ status: ticketResuelto.estado });
            this.cargarInfoExtendida(ticketResuelto);
            this.cargando.set(false);
            return;
          }
          // Fallback: buscar por :id de la URL si el resolver no entregó ticket
          const id = this.route.snapshot.paramMap.get('id');
          if (!id) {
            this.router.navigate(['/tickets']);
            return;
          }
          this.ticketService.obtenerTicketPorId(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (t) => {
                if (!t) { this.router.navigate(['/tickets']); return; }
                this.ticket.set(t);
                this.statusForm.patchValue({ status: t.estado });
                this.cargarInfoExtendida(t);
                this.cargando.set(false);
              },
              error: () => this.router.navigate(['/tickets']),
            });
        });
      });

    // Continuar suscripción al usuario para reaccionar a cambios de rol en tiempo de vida del componente
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.usuarioActual.set(user));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Carga de info extendida (nombre creador / asignado) ──────────────────
  private cargarInfoExtendida(t: Ticket): void {
    const u = this.usuarioActual();
    const esAdminOSoporte = u?.role === 'admin' || u?.role === 'support';

    // Si el ticket ya trae creadoPorNombre (siempre lo trae desde el backend),
    // rellenar el resumen del creador sin necesidad de otra petición HTTP
    if (t.creadoPorUid && !t.creadoPorUsuario?.displayName) {
      // Intentar cargar perfil completo solo si admin/soporte,
      // o si el creador es el mismo usuario logueado (propio perfil — 200 OK garantizado)
      const esPropioTicket = t.creadoPorUid === u?.uid;
      if (esAdminOSoporte || esPropioTicket) {
        this.userService.getUserById(t.creadoPorUid)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: user => {
              if (user) {
                this.ticket.update(actual => actual
                  ? { ...actual, creadoPorUsuario: { uid: user.uid, displayName: user.displayName || user.email || 'Usuario', email: user.email || '', photoURL: user.photoURL ?? null } }
                  : actual
                );
              }
            },
            // Si falla la petición, rellenar con los datos que ya trae el ticket
            error: () => {
              this.ticket.update(actual => actual
                ? { ...actual, creadoPorUsuario: { uid: t.creadoPorUid, displayName: t.creadoPorNombre || 'Usuario', email: '', photoURL: null } }
                : actual
              );
            },
          });
      } else {
        // Usuarios normales viendo tickets ajenos (no deberían) — usar nombre del ticket
        this.ticket.update(actual => actual
          ? { ...actual, creadoPorUsuario: { uid: t.creadoPorUid, displayName: t.creadoPorNombre || 'Usuario', email: '', photoURL: null } }
          : actual
        );
      }
    }

    // Para el asignado: solo admin/soporte necesitan ver el perfil completo.
    // El ticket ya trae asignadoANombre — usarlo directamente para usuarios normales.
    if (t.asignadoAUid && !t.asignadoUsuario?.displayName) {
      if (esAdminOSoporte) {
        this.userService.getUserById(t.asignadoAUid)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: user => {
              if (user) {
                this.ticket.update(actual => actual
                  ? { ...actual, asignadoUsuario: { uid: user.uid, displayName: user.displayName || user.email || '', email: user.email || '', photoURL: user.photoURL ?? null } }
                  : actual
                );
              }
            },
            error: () => {
              // Fallback con el nombre ya guardado en el ticket
              if (t.asignadoAUid && t.asignadoANombre) {
                this.ticket.update(actual => actual
                  ? { ...actual, asignadoUsuario: { uid: t.asignadoAUid!, displayName: t.asignadoANombre!, email: '', photoURL: null } }
                  : actual
                );
              }
            },
          });
      } else if (t.asignadoANombre) {
        // Rellenar con el nombre guardado directamente en el ticket
        this.ticket.update(actual => actual
          ? { ...actual, asignadoUsuario: { uid: t.asignadoAUid!, displayName: t.asignadoANombre!, email: '', photoURL: null } }
          : actual
        );
      }
    }
  }

  // ─── Acciones de usuario ───────────────────────────────────────────────────
  actualizarEstado(): void {
    const t = this.ticket();
    if (!t || this.statusForm.invalid) return;

    const { status, statusNote } = this.statusForm.value;
    if (status === t.estado) {
      this.notificaciones.advertencia('No se detectaron cambios');
      return;
    }

    this.actualizando.set(true);
    this.ticketService.cambiarEstado(t.id, status as TicketStatus, statusNote ?? '')
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.exito('Estado actualizado'), error: (e) => this.fallo(e) });
  }

  asignarTicket(): void {
    const t = this.ticket();
    if (!t || this.assignForm.invalid) return;

    const { assignedTo } = this.assignForm.value;
    if (assignedTo === t.asignadoAUid) {
      this.notificaciones.advertencia('El ticket ya está asignado a este técnico');
      return;
    }

    this.actualizando.set(true);
    this.ticketService.asignarTicket(t.id, assignedTo!, '')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.assignForm.reset({ assignedTo: '', assignNote: '' });
          this.exito('Ticket asignado correctamente');
        },
        error: (e) => this.fallo(e),
      });
  }

  asignarmeTicket(): void {
    const t = this.ticket();
    const u = this.usuarioActual();
    if (!t || !u) return;

    this.actualizando.set(true);
    this.ticketService.asignarTicket(t.id, u.uid, u.displayName || u.email || '')
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.exito('Ticket asignado a ti correctamente'), error: (e) => this.fallo(e) });
  }

  agregarComentario(datos: { comment: string; files: File[] }, ticketId: string): void {
    if (!datos.comment.trim()) return;
    this.actualizando.set(true);
    this.ticketService.addComment(ticketId, datos.comment)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.exito('Comentario añadido'), error: (e) => this.fallo(e) });
  }

  eliminarArchivo(archivo: IArchivo): void {
    const t = this.ticket();
    if (!t) return;
    this.actualizando.set(true);
    this.ticketService.eliminarArchivoDeTicket(t.id, archivo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ticketActualizado) => {
          this.ticket.set(ticketActualizado);
          this.actualizando.set(false);
          this.notificaciones.exito('Archivo eliminado');
        },
        error: (e) => this.fallo(e),
      });
  }

  volver(): void {
    this.router.navigate(['/tickets']);
  }

  // ─── Helpers de éxito/error ────────────────────────────────────────────────
  private exito(mensaje: string): void {
    const t = this.ticket();
    if (!t) { this.actualizando.set(false); return; }
    this.ticketService.obtenerTicketPorId(t.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ticketRefrescado) => {
          if (ticketRefrescado) {
            this.ticket.set(ticketRefrescado);
            this.statusForm.patchValue({ status: ticketRefrescado.estado });
            this.cargarInfoExtendida(ticketRefrescado);
          }
          this.actualizando.set(false);
          this.notificaciones.exito(mensaje);
        },
        error: () => {
          this.actualizando.set(false);
          this.notificaciones.exito(mensaje);
        },
      });
  }

  private fallo(err: Error): void {
    this.actualizando.set(false);
    this.notificaciones.error(err?.message ?? 'Error inesperado');
  }
}
