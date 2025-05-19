import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TicketService } from '../../../../core/services/ticket.service';
import { DepartmentService } from '../../../../core/services/department.service';
import { Observable, of } from 'rxjs';
import { Ticket, TicketCategory, TicketPriority } from '../../../../core/models/ticket.model';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';

@Component({
  selector: 'app-ticket-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    FileUploadComponent
  ],
  templateUrl: './ticket-form.component.html',
  styleUrls: ['./ticket-form.component.scss']
})
export class TicketFormComponent implements OnInit {
  ticketForm: FormGroup;
  isEditMode = false;
  loading = false;
  submitLoading = false;
  ticket: Ticket | null = null;
  departments$: Observable<string[]> = of([]);
  selectedFiles: File[] = [];

  categories: { value: TicketCategory, label: string }[] = [
    { value: 'hardware', label: 'Hardware' },
    { value: 'software', label: 'Software' },
    { value: 'red', label: 'Red' },
    { value: 'accesos', label: 'Accesos' },
    { value: 'otro', label: 'Otro' }
  ];

  priorities: { value: TicketPriority, label: string }[] = [
    { value: 'baja', label: 'Baja' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
    { value: 'critica', label: 'Crítica' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private departmentService: DepartmentService,
    private snackBar: MatSnackBar
  ) {
    this.ticketForm = this.createForm();
  }

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
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      category: ['', Validators.required],
      priority: ['media', Validators.required],
      department: ['', Validators.required],
      estimatedTime: [null, [Validators.min(0), Validators.max(10000)]]
    });
  }

  private patchFormValues(ticket: Ticket): void {
    this.ticketForm.patchValue({
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      department: ticket.department,
      estimatedTime: ticket.estimatedTime
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

  private handleSuccess(message: string): void {
    this.submitLoading = false;
    this.snackBar.open(message, 'Cerrar', { duration: 3000 });
    this.router.navigate(['/tickets']);
  }

  private handleError(err: any): void {
    this.submitLoading = false;
    this.snackBar.open(`Error: ${err.message}`, 'Cerrar', { duration: 5000 });
  }
}
