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
  loading = true;
  statusForm: FormGroup;

  availableStatuses: { value: TicketStatus, label: string }[] = [
    { value: 'nuevo', label: 'Nuevo' },
    { value: 'asignado', label: 'Asignado' },
    { value: 'en_proceso', label: 'En Proceso' },
    { value: 'en_espera', label: 'En Espera' },
    { value: 'resuelto', label: 'Resuelto' },
    { value: 'cerrado', label: 'Cerrado' }
  ];

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

    this.statusForm = this.fb.group({
      status: ['', Validators.required],
      comment: [''],
      assignTo: ['']
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.ticket = data['ticket'];
      this.loading = false;

      if (this.ticket) {
        this.statusForm.patchValue({
          status: this.ticket.status
        });
      }
    });
  }

  updateStatus(): void {
    if (!this.ticket || this.statusForm.invalid) return;

    const { status, comment, assignTo } = this.statusForm.value;

    if (status === this.ticket.status && !assignTo) {
      this.snackBar.open('No se detectaron cambios para actualizar', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading = true;

    // Si hay asignación, asignar primero
    if (assignTo && assignTo !== this.ticket.assignedTo) {
      this.userService.getUserById(assignTo).pipe(
        switchMap(user => {
          if (!user) throw new Error('Usuario no encontrado');
          return this.ticketService.assignTicket(this.ticket!.id, user.uid, user.displayName || user.email || 'Usuario');
        }),
        switchMap(() => {
          if (status !== this.ticket!.status) {
            return this.ticketService.updateTicketStatus(this.ticket!.id, status, comment);
          }
          return this.refreshTicket();
        })
      ).subscribe({
        next: () => this.handleSuccess('Ticket actualizado correctamente'),
        error: (err) => this.handleError(err)
      });
    } else if (status !== this.ticket.status) {
      // Solo actualizar estado
      this.ticketService.updateTicketStatus(this.ticket.id, status, comment).subscribe({
        next: () => this.handleSuccess('Estado actualizado correctamente'),
        error: (err) => this.handleError(err)
      });
    }
  }

  addComment(comment: any, ticketId: string, files?: File[]): void {
    if (!this.ticket) return;

    this.loading = true;
    this.ticketService.addComment(this.ticket.id, comment, files || []).subscribe({
      next: () => this.handleSuccess('Comentario agregado correctamente'),
      error: (err) => this.handleError(err)
    });
  }

  private refreshTicket(): Observable<void> {
    return this.ticketService.getTicketById(this.ticket!.id).pipe(
      tap(refreshedTicket => {
        if (refreshedTicket) {
          this.ticket = refreshedTicket;
        }
      }),
      map(() => undefined)
    );
  }

  private handleSuccess(message: string): void {
    this.refreshTicket().subscribe(() => {
      this.loading = false;
      this.snackBar.open(message, 'Cerrar', { duration: 3000 });
    });
  }

  private handleError(err: any): void {
    this.loading = false;
    this.snackBar.open(`Error: ${err.message}`, 'Cerrar', { duration: 5000 });
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

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  canChangeStatus(user: UserProfile | null): boolean {
    if (!user || !this.ticket) return false;
    return user.role === 'admin' ||
           user.role === 'support' ||
           this.ticket.createdBy === user.uid;
  }
}
