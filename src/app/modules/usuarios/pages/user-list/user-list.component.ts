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
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
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
