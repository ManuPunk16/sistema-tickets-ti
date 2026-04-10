import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TicketService } from '../../../../core/services/ticket.service';
import { DepartmentService } from '../../../../core/services/department.service';
import { Observable, of } from 'rxjs';
import { Ticket, CategoriaTicket, PrioridadTicket } from '../../../../core/models/ticket.model';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';

@Component({
  selector: 'app-ticket-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FileUploadComponent,
  ],
  templateUrl: './ticket-form.component.html',
  styleUrls: ['./ticket-form.component.scss']
})
export class TicketFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private departmentService = inject(DepartmentService);

  ticketForm: FormGroup = this.createForm();
  isEditMode = false;
  loading = false;
  submitLoading = false;
  ticket: Ticket | null = null;
  departments$: Observable<string[]> = of([]);
  selectedFiles: File[] = [];
  protected errorMensaje = signal<string | null>(null);

  categories: { value: CategoriaTicket, label: string }[] = [
    { value: 'hardware', label: 'Hardware' },
    { value: 'software', label: 'Software' },
    { value: 'red', label: 'Red' },
    { value: 'accesos', label: 'Accesos' },
    { value: 'correo', label: 'Correo' },
    { value: 'impresoras', label: 'Impresoras' },
    { value: 'telefonos', label: 'Teléfonos' },
    { value: 'servidores', label: 'Servidores' },
    { value: 'seguridad', label: 'Seguridad' },
    { value: 'otro', label: 'Otro' },
  ];

  priorities: { value: PrioridadTicket, label: string }[] = [
    { value: 'baja', label: 'Baja' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
    { value: 'critica', label: 'Crítica' }
  ];

  ngOnInit(): void {
    // Obtener departamentos
    this.departments$ = this.departmentService.getDepartments();

    // Verificar si estamos en modo edición
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isEditMode = true;
        this.loading = true;

        this.route.data.subscribe(data => {
          this.ticket = data['ticket'];
          if (this.ticket) {
            this.patchFormValues(this.ticket);
          }
          this.loading = false;
        });
      }
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      titulo:      ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.required, Validators.maxLength(2000)]],
      categoria:   ['', Validators.required],
      prioridad:   ['media', Validators.required],
      departamento:['', Validators.required],
    });
  }

  private patchFormValues(ticket: Ticket): void {
    this.ticketForm.patchValue({
      titulo:       ticket.titulo,
      descripcion:  ticket.descripcion,
      categoria:    ticket.categoria,
      prioridad:    ticket.prioridad,
      departamento: ticket.departamento,
    });
  }

  onSubmit(): void {
    if (this.ticketForm.invalid) return;

    this.submitLoading = true;
    const ticketData = this.ticketForm.value;

    if (this.isEditMode && this.ticket) {
      this.ticketService.updateTicket(this.ticket.id, ticketData).subscribe({
        next: () => this.handleSuccess('Ticket actualizado correctamente'),
        error: (err) => this.handleError(err)
      });
    } else {
      this.ticketService.createTicket(ticketData).subscribe({
        next: (ticketId) => {
          if (this.selectedFiles.length > 0) {
            // Si hay archivos, subirlos antes de navegar
            this.uploadFiles(ticketId);
          } else {
            this.handleSuccess('Ticket creado correctamente');
          }
        },
        error: (err) => this.handleError(err)
      });
    }
  }

  onFilesSelected(files: File[]): void {
    this.selectedFiles = files;
  }

  /**
   * Elimina un archivo de la lista de archivos seleccionados
   */
  removeFile(index: number): void {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  private uploadFiles(ticketId: string): void {
    // Esta función simula la carga de archivos y luego navega
    // En una implementación real, esto debería ser manejado por TicketService
    const uploadPromises = this.selectedFiles.map(file => {
      return this.ticketService.uploadAttachment(ticketId, file);
    });

    Promise.all(uploadPromises)
      .then(() => {
        this.handleSuccess('Ticket creado correctamente con archivos adjuntos');
      })
      .catch(err => {
        this.handleError(err);
      });
  }

  private handleSuccess(_mensaje: string): void {
    this.submitLoading = false;
    this.router.navigate(['/tickets']);
  }

  private handleError(err: unknown): void {
    this.submitLoading = false;
    const msg = err instanceof Error ? err.message : 'Ocurrió un error inesperado';
    this.errorMensaje.set(msg);
  }
}
