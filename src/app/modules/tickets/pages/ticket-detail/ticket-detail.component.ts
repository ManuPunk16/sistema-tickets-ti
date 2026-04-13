import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, map, switchMap, tap } from 'rxjs';

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
export class TicketDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private notificaciones = inject(NotificacionService);
  private cdr = inject(ChangeDetectorRef);

  ticket: Ticket | null = null;
  currentUser$: Observable<UserProfile | null>;
  supportUsers$: Observable<UserProfile[]>;
  supportUsers: UserProfile[] = [];
  isLoading = true;
  isUpdating = false;
  errorMessage: string | null = null;

  // Formularios
  statusForm = this.fb.group({
    status: ['', Validators.required],
    statusNote: [''],
  });

  assignForm = this.fb.group({
    assignedTo: ['', Validators.required],
    assignNote: [''],
  });

  // Tab activo
  activeTab = 'comments';

  // Opciones de estado disponibles
  availableStatuses: { value: TicketStatus; label: string }[] = [
    { value: 'nuevo', label: 'Nuevo' },
    { value: 'asignado', label: 'Asignado' },
    { value: 'en_proceso', label: 'En Proceso' },
    { value: 'en_espera', label: 'En Espera' },
    { value: 'resuelto', label: 'Resuelto' },
    { value: 'cerrado', label: 'Cerrado' },
  ];

  get availableStatusOptions() {
    return this.availableStatuses;
  }

  constructor() {
    this.currentUser$ = this.authService.getCurrentUser();
    this.supportUsers$ = this.userService.getUsersByRole('support');
  }

  // Métodos helper para clases de badges (evitar [ngClass])
  protected claseBadgeEstado(estado: string): string {
    const mapa: { [key: string]: string } = {
      nuevo:     'bg-gray-100 text-gray-800',
      asignado:  'bg-blue-100 text-blue-800',
      en_proceso:'bg-yellow-100 text-yellow-800',
      en_espera: 'bg-orange-100 text-orange-800',
      resuelto:  'bg-green-100 text-green-800',
      cerrado:   'bg-red-100 text-red-800',
    };
    return mapa[estado] ?? 'bg-gray-100 text-gray-800';
  }

  protected claseBadgePrioridad(prioridad: string): string {
    const mapa: { [key: string]: string } = {
      baja:   'bg-green-100 text-green-800',
      media:  'bg-yellow-100 text-yellow-800',
      alta:   'bg-red-100 text-red-800',
      critica:'bg-purple-100 text-purple-800',
    };
    return mapa[prioridad] ?? 'bg-gray-100 text-gray-800';
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.ticket = data['ticket'];
      this.isLoading = false;

      if (this.ticket) {
        // Inicializar el formulario de estado con el valor actual
        this.statusForm.patchValue({
          status: this.ticket.estado,
        });

        // Cargar información extendida del ticket
        this.loadExtendedTicketInfo();
      }

      // Cargar lista de usuarios de soporte
      this.supportUsers$.subscribe(users => {
        this.supportUsers = users;
        this.cdr.markForCheck();
      });

      this.cdr.markForCheck();
    });
  }

  /**
   * Actualiza el estado del ticket
   */
  updateStatus(): void {
    if (!this.ticket || this.statusForm.invalid) return;

    const { status, statusNote } = this.statusForm.value;

    if (status === this.ticket.estado) {
      this.notificaciones.advertencia('No se detectaron cambios para actualizar');
      return;
    }

    this.isUpdating = true;

    this.ticketService.updateTicketStatus(this.ticket.id, status as TicketStatus, statusNote ?? '')
      .subscribe({
        next: () => {
          this.handleSuccess('Estado actualizado correctamente');
        },
        error: (err) => {
          this.handleError(err);
        }
      });
  }

  /**
   * Asigna el ticket al técnico seleccionado
   */
  assignTicket(): void {
    if (!this.ticket || this.assignForm.invalid) return;

    const { assignedTo, assignNote } = this.assignForm.value;

    if (assignedTo === this.ticket.asignadoAUid) {
      this.notificaciones.advertencia('El ticket ya está asignado a este técnico');
      return;
    }

    this.isUpdating = true;

    this.userService.getUserById(assignedTo!).pipe(
      switchMap(user => {
        if (!user) throw new Error('Usuario no encontrado');
        return this.ticketService.asignarTicket(this.ticket!.id, user.uid, user.displayName || user.email || 'Usuario');
      })
    ).subscribe({
      next: () => {
        this.handleSuccess('Ticket asignado correctamente');
        this.assignForm.reset({
          assignedTo: '',
          assignNote: ''
        });
      },
      error: (err) => {
        this.handleError(err);
      }
    });
  }

  /**
   * Asigna el ticket al usuario actual
   */
  assignToMe(): void {
    if (!this.ticket) return;

    this.isUpdating = true;

    this.currentUser$.pipe(
      switchMap(user => {
        if (!user) throw new Error('Usuario no autenticado');
        return this.ticketService.asignarTicket(this.ticket!.id, user.uid, user.displayName || user.email || 'Usuario');
      })
    ).subscribe({
      next: () => {
        this.handleSuccess('Ticket asignado a ti correctamente');
      },
      error: (err) => {
        this.handleError(err);
      }
    });
  }

  /**
   * Añade un comentario al ticket
   */
  addComment(commentData: { comment: string; files: File[] }, ticketId: string): void {
    if (!commentData.comment.trim()) return;

    this.isUpdating = true;

    // Si hay archivos adjuntos, primero subimos los archivos
    if (commentData.files && commentData.files.length > 0) {
      this.uploadFilesAndAddComment(commentData.files, commentData.comment, ticketId);
    } else {
      // Si no hay archivos, simplemente añadimos el comentario
      this.ticketService.addComment(ticketId, commentData.comment).subscribe({
        next: () => {
          this.handleSuccess('Comentario añadido correctamente');
        },
        error: (err) => {
          this.handleError(err);
        }
      });
    }
  }

  /**
   * Sube archivos y luego añade el comentario con referencias a los archivos
   */
  private uploadFilesAndAddComment(files: File[], comment: string, ticketId: string): void {
    // Utilizamos el método uploadFiles implementado en el servicio
    this.ticketService.uploadFiles(ticketId, files).pipe(
      switchMap(fileUrls => {
        // Añadir comentario con archivos adjuntos
        return this.ticketService.addCommentWithAttachments(ticketId, comment, fileUrls);
      })
    ).subscribe({
      next: () => {
        this.handleSuccess('Comentario y archivos añadidos correctamente');
      },
      error: (error: Error) => {
        this.handleError(error);
      }
    });
  }

  /**
   * Navega hacia atrás
   */
  goBack(): void {
    this.router.navigate(['/tickets']);
  }

  /**
   * Verifica si el usuario puede cambiar el estado del ticket
   */
  canChangeStatus(user: UserProfile | null): boolean {
    if (!user || !this.ticket) return false;
    return user.role === 'admin' ||
           user.role === 'support' ||
           this.ticket.creadoPorUid === user.uid;
  }

  /**
   * Verifica si el usuario puede asignar el ticket
   */
  canAssignTicket(user: UserProfile | null): boolean {
    if (!user || !this.ticket) return false;
    return user.role === 'admin' || user.role === 'support';
  }

  /**
   * Verifica si el usuario puede editar el ticket
   */
  canEditTicket(user: UserProfile | null): boolean {
    if (!user || !this.ticket) return false;
    return user.role === 'admin' ||
           this.ticket.creadoPorUid === user.uid ||
           (user.role === 'support' && this.ticket.asignadoAUid === user.uid);
  }

  /** Verifica si el usuario puede eliminar archivos adjuntos del ticket */
  puedeEliminarArchivo(user: UserProfile | null): boolean {
    if (!user || !this.ticket) return false;
    return user.role === 'admin' ||
           user.role === 'support' ||
           this.ticket.creadoPorUid === user.uid;
  }

  /** Elimina un archivo adjunto de Firebase Storage y de MongoDB */
  eliminarArchivo(archivo: IArchivo): void {
    if (!this.ticket) return;
    this.isUpdating = true;
    this.ticketService.eliminarArchivoDeTicket(this.ticket.id, archivo).subscribe({
      next: (ticketActualizado) => {
        this.ticket = ticketActualizado;
        this.isUpdating = false;
        this.notificaciones.exito('Archivo eliminado correctamente');
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.isUpdating = false;
        this.notificaciones.error(`Error al eliminar el archivo: ${err.message}`);
        this.cdr.markForCheck();
      },
    });
  }

  /** @deprecated Ya no es necesario; el componente recibe IArchivo[] directamente */
  obtenerUrlsArchivos(archivos: IArchivo[] | undefined): string[] {
    return (archivos ?? []).map(a => a.url);
  }

  /**
   * Obtiene las iniciales del nombre de usuario para mostrar en el avatar
   */
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
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
      'critica': 'Crítica'
    };

    return priorityMap[priority] || priority;
  }

  /**
   * Maneja el éxito de una operación
   */
  private handleSuccess(message: string): void {
    this.refreshTicket().subscribe(() => {
      this.isUpdating = false;
      this.notificaciones.exito(message);
      this.cdr.markForCheck();
    });
  }

  private handleError(err: Error): void {
    this.isUpdating = false;
    this.notificaciones.error(`Error: ${err.message}`);
    this.cdr.markForCheck();
  }

  /**
   * Actualiza el ticket desde el servidor
   */
  private refreshTicket() {
    if (!this.ticket) {
      return new Observable(observer => observer.complete());
    }

    return this.ticketService.getTicketById(this.ticket.id).pipe(
      tap(refreshedTicket => {
        if (refreshedTicket) {
          this.ticket = refreshedTicket;

          // Cargar información extendida del ticket actualizado
          this.loadExtendedTicketInfo();
        }
      }),
      map(() => undefined)
    );
  }

  /**
   * Carga datos extendidos para el ticket (información de usuario)
   */
  private loadExtendedTicketInfo(): void {
    if (!this.ticket) return;

    // Cargar información del creador
    if (this.ticket.creadoPorUid) {
      this.userService.getUserById(this.ticket.creadoPorUid).subscribe(user => {
        if (user) {
          this.ticket!.creadoPorUsuario = {
            uid: user.uid,
            displayName: user.displayName || user.email || 'Usuario',
            email: user.email || 'correo@ejemplo.com',
            photoURL: user.photoURL || null
          };
        }
      });
    }

    // Cargar información del asignado
    if (this.ticket.asignadoAUid) {
      this.userService.getUserById(this.ticket.asignadoAUid).subscribe(user => {
        if (user) {
          this.ticket!.asignadoUsuario = {
            uid: user.uid,
            displayName: user.displayName || user.email || 'Usuario',
            email: user.email || 'correo@ejemplo.com',
            photoURL: user.photoURL || null
          };
        }
      });
    }
  }
}
