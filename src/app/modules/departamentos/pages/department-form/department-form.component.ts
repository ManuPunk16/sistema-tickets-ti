import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DepartmentService } from '../../../../core/services/department.service';

@Component({
  selector: 'app-department-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="p-4 md:p-6">
      <div class="flex items-center mb-6">
        <button mat-icon-button [routerLink]="['/departamentos']" matTooltip="Volver">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="text-2xl font-bold ml-2">{{ isEditMode ? 'Editar' : 'Nuevo' }} Departamento</h1>
      </div>

      <mat-card>
        <mat-card-content>
          <div *ngIf="loading" class="flex justify-center py-8">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <form *ngIf="!loading" [formGroup]="departmentForm" (ngSubmit)="onSubmit()" class="p-4">
            <mat-form-field appearance="outline" class="w-full mb-4">
              <mat-label>Nombre del Departamento</mat-label>
              <input matInput formControlName="name" placeholder="Ej. Recursos Humanos">
              <mat-error *ngIf="departmentForm.get('name')?.hasError('required')">
                El nombre del departamento es obligatorio
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full mb-4">
              <mat-label>Descripción</mat-label>
              <textarea matInput formControlName="description" rows="4"
                placeholder="Describe las funciones principales del departamento"></textarea>
            </mat-form-field>

            <div class="flex justify-end gap-2 mt-4">
              <button mat-stroked-button [routerLink]="['/departamentos']" type="button">
                Cancelar
              </button>
              <button mat-raised-button color="primary" type="submit"
                [disabled]="departmentForm.invalid || isSubmitting">
                <mat-icon *ngIf="isSubmitting">
                  <mat-spinner diameter="20" color="accent"></mat-spinner>
                </mat-icon>
                <span *ngIf="!isSubmitting">{{ isEditMode ? 'Actualizar' : 'Crear' }}</span>
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DepartmentFormComponent implements OnInit {
  departmentForm: FormGroup;
  isEditMode = false;
  loading = false;
  isSubmitting = false;
  departmentId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private departmentService: DepartmentService,
    private snackBar: MatSnackBar
  ) {
    this.departmentForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isEditMode = true;
        this.departmentId = id;
        this.loading = true;

        this.departmentService.getDepartmentById(id).subscribe({
          next: (department) => {
            if (department) {
              this.departmentForm.patchValue({
                name: department.name,
                description: department.description
              });
            } else {
              this.snackBar.open('Departamento no encontrado', 'Cerrar', { duration: 3000 });
              this.router.navigate(['/departamentos']);
            }
            this.loading = false;
          },
          error: (error) => {
            this.snackBar.open('Error al cargar departamento: ' + error.message, 'Cerrar', { duration: 3000 });
            this.router.navigate(['/departamentos']);
          }
        });
      }
    });
  }

  onSubmit(): void {
    if (this.departmentForm.invalid) return;

    this.isSubmitting = true;
    const formData = this.departmentForm.value;

    if (this.isEditMode && this.departmentId) {
      this.departmentService.updateDepartment(this.departmentId, formData).subscribe({
        next: () => {
          this.snackBar.open('Departamento actualizado correctamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/departamentos']);
        },
        error: (error) => {
          this.snackBar.open('Error al actualizar departamento: ' + error.message, 'Cerrar', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    } else {
      this.departmentService.createDepartment(formData).subscribe({
        next: () => {
          this.snackBar.open('Departamento creado correctamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/departamentos']);
        },
        error: (error) => {
          this.snackBar.open('Error al crear departamento: ' + error.message, 'Cerrar', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }
}
