import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Departamento } from '../models/department.model';

// Tipo de respuesta cruda del API (usa _id de MongoDB)
type DepartamentoRaw = Omit<Departamento, 'id'> & { _id: string };

interface RespuestaDepartamentos {
  ok: boolean;
  departamentos: DepartamentoRaw[];
}

interface RespuestaDepartamento {
  ok: boolean;
  departamento: DepartamentoRaw;
}

// Reasigna _id → id para uniformidad en el frontend
function mapear(d: DepartamentoRaw): Departamento {
  const { _id, ...resto } = d;
  return { id: _id, ...resto };
}

/** @deprecated Importar Departamento desde core/models/department.model */
export type Department = Departamento;

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private http    = inject(HttpClient);
  private urlBase = `${environment.apiUrl}/departamentos`;

  /**
   * Devuelve solo los nombres de los departamentos activos.
   * Usado por: user-form, ticket-list, department-report.
   */
  getDepartments(): Observable<string[]> {
    return this.http
      .get<RespuestaDepartamentos>(this.urlBase)
      .pipe(map(r => r.departamentos.map(d => d.nombre)));
  }

  /**
   * Devuelve la lista completa de departamentos.
   * Usado por: department-list.
   */
  getDepartmentDetails(soloActivos = true): Observable<Departamento[]> {
    let params = new HttpParams();
    if (!soloActivos) params = params.set('todos', 'true');
    return this.http
      .get<RespuestaDepartamentos>(this.urlBase, { params })
      .pipe(map(r => r.departamentos.map(mapear)));
  }

  getDepartmentById(id: string): Observable<Departamento | null> {
    return this.http
      .get<RespuestaDepartamento>(`${this.urlBase}/${id}`)
      .pipe(map(r => mapear(r.departamento)));
  }

  createDepartment(datos: Pick<Departamento, 'nombre' | 'descripcion' | 'responsableUid'>): Observable<string> {
    return this.http
      .post<RespuestaDepartamento>(this.urlBase, datos)
      .pipe(map(r => r.departamento._id));
  }

  updateDepartment(
    id: string,
    datos: Partial<Pick<Departamento, 'nombre' | 'descripcion' | 'responsableUid'>>,
  ): Observable<void> {
    return this.http
      .put<RespuestaDepartamento>(`${this.urlBase}/${id}`, datos)
      .pipe(map(() => void 0));
  }

  deleteDepartment(id: string): Observable<void> {
    return this.http
      .delete<{ ok: boolean }>(`${this.urlBase}/${id}`)
      .pipe(map(() => void 0));
  }
}

