import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DepartmentService } from '../../../../core/services/department.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { Departamento } from '../../../../core/models/department.model';

@Component({
  selector: 'app-department-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-4 md:p-6">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Departamentos</h1>
        <a
          [routerLink]="['/departamentos/nuevo']"
          class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
          </svg>
          Nuevo Departamento
        </a>
      </div>

      <!-- Estado de carga -->
      @if (cargando()) {
        <div class="flex justify-center py-16" role="status" aria-label="Cargando departamentos">
          <div class="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      <!-- Tabla -->
      @if (!cargando()) {
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          @if (departamentos().length === 0) {
            <div class="flex flex-col items-center justify-center py-16 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              <p class="font-medium">No hay departamentos registrados</p>
              <p class="text-sm mt-1">Crea el primero usando el botón superior</p>
            </div>
          }

          @if (departamentos().length > 0) {
            <!-- Vista escritorio: tabla -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Creado</th>
                    <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  @for (dept of departamentos(); track dept.id) {
                    <tr class="hover:bg-gray-50 transition-colors">
                      <td class="px-6 py-4 font-medium text-gray-900">{{ dept.nombre }}</td>
                      <td class="px-6 py-4 text-gray-500 max-w-xs truncate">{{ dept.descripcion || '—' }}</td>
                      <td class="px-6 py-4">
                        @if (dept.activo) {
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span>
                        } @else {
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inactivo</span>
                        }
                      </td>
                      <td class="px-6 py-4 text-gray-500">{{ formatearFecha(dept.createdAt) }}</td>
                      <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-1">
                          <a
                            [routerLink]="['/departamentos/editar', dept.id]"
                            class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label="Editar departamento"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                            </svg>
                          </a>
                          <button
                            type="button"
                            (click)="confirmarEliminar(dept)"
                            class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-label="Eliminar departamento"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Vista móvil: tarjetas -->
            <div class="md:hidden divide-y divide-gray-100">
              @for (dept of departamentos(); track dept.id) {
                <div class="p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-gray-900 truncate">{{ dept.nombre }}</p>
                      @if (dept.descripcion) {
                        <p class="text-sm text-gray-500 mt-0.5 line-clamp-2">{{ dept.descripcion }}</p>
                      }
                      <div class="flex items-center gap-2 mt-2">
                        @if (dept.activo) {
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span>
                        } @else {
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inactivo</span>
                        }
                        <span class="text-xs text-gray-400">{{ formatearFecha(dept.createdAt) }}</span>
                      </div>
                    </div>
                    <div class="flex gap-1 flex-shrink-0">
                      <a
                        [routerLink]="['/departamentos/editar', dept.id]"
                        class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                        aria-label="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                        </svg>
                      </a>
                      <button
                        type="button"
                        (click)="confirmarEliminar(dept)"
                        class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Eliminar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Pie: contador -->
            <div class="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
              {{ departamentos().length }} departamento{{ departamentos().length !== 1 ? 's' : '' }} en total
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DepartmentListComponent implements OnInit {
  private departmentService = inject(DepartmentService);
  private notificacion = inject(NotificacionService);

  protected departamentos = signal<Departamento[]>([]);
  protected cargando = signal(true);

  ngOnInit(): void {
    this.cargarDepartamentos();
  }

  protected cargarDepartamentos(): void {
    this.cargando.set(true);
    this.departmentService.getDepartmentDetails(false).subscribe({
      next: (lista) => {
        this.departamentos.set(lista);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.notificacion.error('Error al cargar departamentos: ' + err.message);
        this.cargando.set(false);
      }
    });
  }

  protected confirmarEliminar(dept: Departamento): void {
    if (!confirm(`¿Eliminar el departamento "${dept.nombre}"? Esta acción no se puede deshacer.`)) return;

    this.departmentService.deleteDepartment(dept.id).subscribe({
      next: () => {
        this.notificacion.exito(`Departamento "${dept.nombre}" eliminado correctamente`);
        this.cargarDepartamentos();
      },
      error: (err: Error) => {
        this.notificacion.error('Error al eliminar departamento: ' + err.message);
      }
    });
  }

  protected formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }
}
