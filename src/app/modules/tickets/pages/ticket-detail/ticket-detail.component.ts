import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, map, switchMap, tap } from 'rxjs';

import { Ticket, TicketStatus } from '../../../../core/models/ticket.model';
import { TicketService } from '../../../../core/services/ticket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
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
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    TicketTimelineComponent,
    TicketCommentFormComponent,
    TicketCommentsListComponent,
    TicketFilesComponent
  ],
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.scss']
})
export class TicketDetailComponent implements OnInit {
  ticket: Ticket | null = null;
  currentUser$: Observable<UserProfile | null>;
  supportUsers$: Observable<UserProfile[]>;
  supportUsers: UserProfile[] = []; // Lista de usuarios de soporte para el dropdown
  isLoading = true;
  isUpdating = false; // Para controlar estados de carga durante actualización
  errorMessage: string | null = null;
  
  // Formularios
  statusForm: FormGroup;
  assignForm: FormGroup;

  // Tab activo
  activeTab = 'comments'; // Valor por defecto: 'comments', 'timeline', 'files'

  // Opciones de estado disponibles
  availableStatuses: { value: TicketStatus, label: string }[] = [
    { value: 'nuevo', label: 'Nuevo' },
    { value: 'asignado', label: 'Asignado' },
    { value: 'en_proceso', label: 'En Proceso' },
    { value: 'en_espera', label: 'En Espera' },
    { value: 'resuelto', label: 'Resuelto' },
    { value: 'cerrado', label: 'Cerrado' }
  ];

  // Alias para compatibility con el template
  get availableStatusOptions() {
    return this.availableStatuses;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private authService: AuthService,
    private userService: UserService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.currentUser$ = this.authService.getCurrentUser();
    this.supportUsers$ = this.userService.getUsersByRole('support');

    // Inicializar formularios
    this.statusForm = this.fb.group({
      status: ['', Validators.required],
      statusNote: ['']
    });

    this.assignForm = this.fb.group({
      assignedTo: ['', Validators.required],
      assignNote: ['']
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.ticket = data['ticket'];
      this.isLoading = false;
      
      if (this.ticket) {
        // Inicializar el formulario de estado con el valor actual
        this.statusForm.patchValue({
          status: this.ticket.status
        });
        
        // Cargar información extendida del ticket
        this.loadExtendedTicketInfo();
      }
      
      // Cargar lista de usuarios de soporte
      this.supportUsers$.subscribe(users => {
        this.supportUsers = users;
      });
    });
  }

  /**
   * Actualiza el estado del ticket
   */
  updateStatus(): void {
    if (!this.ticket || this.statusForm.invalid) return;

    const { status, statusNote } = this.statusForm.value;

    if (status === this.ticket.status) {
      this.snackBar.open('No se detectaron cambios para actualizar', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isUpdating = true;

    this.ticketService.updateTicketStatus(this.ticket.id, status, statusNote)
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

    if (assignedTo === this.ticket.assignedTo) {
      this.snackBar.open('El ticket ya está asignado a este técnico', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isUpdating = true;

    this.userService.getUserById(assignedTo).pipe(
      switchMap(user => {
        if (!user) throw new Error('Usuario no encontrado');
        return this.ticketService.assignTicket(this.ticket!.id, user.uid, user.displayName || user.email || 'Usuario');
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
        return this.ticketService.assignTicket(this.ticket!.id, user.uid, user.displayName || user.email || 'Usuario');
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
           this.ticket.createdBy === user.uid;
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
           this.ticket.createdBy === user.uid ||
           (user.role === 'support' && this.ticket.assignedTo === user.uid);
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
      this.snackBar.open(message, 'Cerrar', { duration: 3000 });
    });
  }

  /**
   * Maneja un error
   */
  private handleError(err: Error): void {
    this.isUpdating = false;
    this.snackBar.open(`Error: ${err.message}`, 'Cerrar', { duration: 5000 });
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
    if (this.ticket.createdBy) {
      this.userService.getUserById(this.ticket.createdBy).subscribe(user => {
        if (user) {
          this.ticket!.createdByUser = {
            uid: user.uid,
            displayName: user.displayName || user.email || 'Usuario',
            email: user.email || 'correo@ejemplo.com',
            photoURL: user.photoURL || null
          };
        }
      });
    }
    
    // Cargar información del asignado
    if (this.ticket.assignedTo) {
      this.userService.getUserById(this.ticket.assignedTo).subscribe(user => {
        if (user) {
          this.ticket!.assignedUser = {
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
