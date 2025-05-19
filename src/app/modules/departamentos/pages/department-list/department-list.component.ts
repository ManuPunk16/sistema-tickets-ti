import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { DepartmentService, Department } from '../../../../core/services/department.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    ReactiveFormsModule,
    RouterLink
  ],
  template: `
    <div class="p-4 md:p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Departamentos</h1>
        <button mat-raised-button color="primary" [routerLink]="['/departamentos/nuevo']">
          <mat-icon class="mr-2">add</mat-icon>
          Nuevo Departamento
        </button>
      </div>

      <mat-card class="mb-6">
        <mat-card-content>
          <div *ngIf="loading" class="flex justify-center py-8">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <div *ngIf="!loading" class="overflow-x-auto">
            <table mat-table [dataSource]="departments" matSort class="w-full">
              <!-- ID Column -->
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
                <td mat-cell *matCellDef="let department">{{ department.id.substring(0, 8) }}</td>
              </ng-container>

              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre</th>
                <td mat-cell *matCellDef="let department">{{ department.name }}</td>
              </ng-container>

              <!-- Description Column -->
              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Descripción</th>
                <td mat-cell *matCellDef="let department">{{ department.description }}</td>
              </ng-container>

              <!-- Created Column -->
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Creado</th>
                <td mat-cell *matCellDef="let department">{{ formatDate(department.createdAt) }}</td>
              </ng-container>

              <!-- Updated Column -->
              <ng-container matColumnDef="updatedAt">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Actualizado</th>
                <td mat-cell *matCellDef="let department">{{ formatDate(department.updatedAt) }}</td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="w-32">Acciones</th>
                <td mat-cell *matCellDef="let department">
                  <button mat-icon-button color="primary" [routerLink]="['/departamentos/editar', department.id]">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="confirmDelete(department)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

              <!-- Empty Row -->
              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell text-center p-8" [attr.colspan]="displayedColumns.length">
                  No hay departamentos registrados en el sistema.
                </td>
              </tr>
            </table>

            <mat-paginator [pageSizeOptions]="[5, 10, 25, 100]" showFirstLastButtons></mat-paginator>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .mat-column-actions {
      width: 100px;
      text-align: center;
    }

    table {
      width: 100%;
    }
  `]
})
export class DepartmentListComponent implements OnInit {
  departments: Department[] = [];
  displayedColumns: string[] = ['id', 'name', 'description', 'createdAt', 'updatedAt', 'actions'];
  loading = true;

  constructor(
    private departmentService: DepartmentService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.departmentService.getDepartmentDetails().subscribe({
      next: (departments) => {
        this.departments = departments;
        this.loading = false;
      },
      error: (error) => {
        this.snackBar.open('Error al cargar departamentos: ' + error.message, 'Cerrar', {
          duration: 3000
        });
        this.loading = false;
      }
    });
  }

  confirmDelete(department: Department): void {
    if (confirm(`¿Estás seguro de eliminar el departamento ${department.name}?`)) {
      this.departmentService.deleteDepartment(department.id).subscribe({
        next: () => {
          this.snackBar.open('Departamento eliminado correctamente', 'Cerrar', {
            duration: 3000
          });
          this.loadDepartments();
        },
        error: (error) => {
          this.snackBar.open('Error al eliminar departamento: ' + error.message, 'Cerrar', {
            duration: 3000
          });
        }
      });
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
