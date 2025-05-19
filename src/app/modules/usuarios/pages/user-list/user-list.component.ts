import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { UserService } from '../../../../core/services/user.service';
import { UserProfile } from '../../../../core/models/user.model';

@Component({
  selector: 'app-user-list',
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
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSelectModule,
    ReactiveFormsModule,
    RouterLink
  ],
  template: `
    <div class="p-4 md:p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Gestión de Usuarios</h1>
        <button mat-raised-button color="primary" [routerLink]="['/usuarios/nuevo']">
          <mat-icon class="mr-2">person_add</mat-icon>
          Nuevo Usuario
        </button>
      </div>

      <!-- Filtros -->
      <mat-card class="mb-6">
        <mat-card-content>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Buscar</mat-label>
              <input matInput [formControl]="searchControl" placeholder="Nombre, email o posición">
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Filtrar por Rol</mat-label>
              <mat-select [formControl]="roleFilter">
                <mat-option value="todos">Todos</mat-option>
                <mat-option value="admin">Administrador</mat-option>
                <mat-option value="support">Soporte</mat-option>
                <mat-option value="user">Usuario</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Departamento</mat-label>
              <mat-select [formControl]="departmentFilter">
                <mat-option value="todos">Todos</mat-option>
                <mat-option *ngFor="let department of departments" [value]="department">
                  {{ department }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tabla de Usuarios -->
      <mat-card>
        <mat-card-content>
          <div *ngIf="loading" class="flex justify-center py-8">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <div *ngIf="!loading" class="overflow-x-auto">
            <table mat-table [dataSource]="dataSource" matSort class="w-full">
              <!-- Avatar Column -->
              <ng-container matColumnDef="avatar">
                <th mat-header-cell *matHeaderCellDef class="w-16"></th>
                <td mat-cell *matCellDef="let user">
                  <div *ngIf="user.photoURL" class="w-10 h-10 rounded-full overflow-hidden">
                    <img [src]="user.photoURL" alt="Avatar" class="w-full h-full object-cover">
                  </div>
                  <div *ngIf="!user.photoURL" class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center">
                    {{ (user.displayName || user.email || 'U')[0].toUpperCase() }}
                  </div>
                </td>
              </ng-container>

              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre / Email</th>
                <td mat-cell *matCellDef="let user">
                  <div class="font-medium">{{ user.displayName || 'Sin nombre' }}</div>
                  <div class="text-xs text-gray-500">{{ user.email }}</div>
                </td>
              </ng-container>

              <!-- Role Column -->
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Rol</th>
                <td mat-cell *matCellDef="let user">
                  <mat-chip [ngClass]="{
                    'bg-indigo-100 text-indigo-800': user.role === 'admin',
                    'bg-green-100 text-green-800': user.role === 'support',
                    'bg-gray-100 text-gray-800': user.role === 'user'
                  }">
                    {{ formatRole(user.role) }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Department Column -->
              <ng-container matColumnDef="department">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Departamento</th>
                <td mat-cell *matCellDef="let user">{{ user.department || 'No asignado' }}</td>
              </ng-container>

              <!-- Position Column -->
              <ng-container matColumnDef="position">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Cargo</th>
                <td mat-cell *matCellDef="let user">{{ user.position || 'No especificado' }}</td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="w-32 text-right">Acciones</th>
                <td mat-cell *matCellDef="let user" class="text-right">
                  <button mat-icon-button [routerLink]="['/usuarios', user.uid]" matTooltip="Ver detalles">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button color="primary" [routerLink]="['/usuarios/editar', user.uid]" matTooltip="Editar usuario">
                    <mat-icon>edit</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                class="hover:bg-gray-50 cursor-pointer"
                [routerLink]="['/usuarios', row.uid]"></tr>

              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell text-center p-8" [attr.colspan]="displayedColumns.length">
                  No se encontraron usuarios con los filtros aplicados.
                </td>
              </tr>
            </table>

            <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .mat-column-actions {
      width: 120px;
      text-align: right;
    }

    table {
      width: 100%;
    }
  `]
})
export class UserListComponent implements OnInit {
  users: UserProfile[] = [];
  filteredUsers: UserProfile[] = [];
  displayedColumns: string[] = ['avatar', 'name', 'role', 'department', 'position', 'actions'];
  dataSource = new MatTableDataSource<UserProfile>([]);
  loading = true;

  searchControl = new FormControl('');
  roleFilter = new FormControl('todos');
  departmentFilter = new FormControl('todos');

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Simulación de departamentos - En una implementación real, esto vendría de un servicio
  departments = ['Sistemas', 'Contabilidad', 'Recursos Humanos', 'Ventas', 'Marketing', 'Operaciones', 'Dirección'];

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadUsers();

    // Configurar el filtrado
    this.searchControl.valueChanges.subscribe(() => this.applyFilters());
    this.roleFilter.valueChanges.subscribe(() => this.applyFilters());
    this.departmentFilter.valueChanges.subscribe(() => this.applyFilters());
  }

  ngAfterViewInit() {
    // Configurar paginación y ordenamiento después de que la vista se inicialice
    if (this.dataSource) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        this.snackBar.open('Error al cargar usuarios: ' + error.message, 'Cerrar', {
          duration: 3000
        });
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.users];

    // Filtrar por búsqueda
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(user =>
        (user.displayName?.toLowerCase().includes(searchTerm) || false) ||
        (user.email?.toLowerCase().includes(searchTerm) || false) ||
        (user.position?.toLowerCase().includes(searchTerm) || false)
      );
    }

    // Filtrar por rol
    const role = this.roleFilter.value;
    if (role && role !== 'todos') {
      filtered = filtered.filter(user => user.role === role);
    }

    // Filtrar por departamento
    const department = this.departmentFilter.value;
    if (department && department !== 'todos') {
      filtered = filtered.filter(user => user.department === department);
    }

    this.filteredUsers = filtered;
    this.dataSource.data = filtered;
  }

  formatRole(role: string): string {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'support': return 'Soporte';
      case 'user': return 'Usuario';
      default: return role;
    }
  }
}
