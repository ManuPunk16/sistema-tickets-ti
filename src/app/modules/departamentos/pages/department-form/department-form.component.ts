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
  templateUrl: './department-form.component.html',
  styleUrls: ['./department-form.component.scss']
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
