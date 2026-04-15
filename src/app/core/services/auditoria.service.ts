import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  FiltrosAuditoria,
  RegistroAuditoria,
  RespuestaAuditoria,
  ResumenAuditoria,
} from '../models/auditoria.model';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private http    = inject(HttpClient);
  private apiUrl  = `${environment.apiUrl}/auditoria`;

  // ─── Listar registros con filtros paginados ────────────────────────────────
  obtenerRegistros(filtros: FiltrosAuditoria = {}): Observable<RespuestaAuditoria> {
    let params = new HttpParams();

    if (filtros.pagina)  params = params.set('pagina',  String(filtros.pagina));
    if (filtros.limite)  params = params.set('limite',  String(filtros.limite));
    if (filtros.uid)     params = params.set('uid',     filtros.uid);
    if (filtros.accion)  params = params.set('accion',  filtros.accion);
    if (filtros.recurso) params = params.set('recurso', filtros.recurso);
    if (filtros.desde)   params = params.set('desde',   filtros.desde);
    if (filtros.hasta)   params = params.set('hasta',   filtros.hasta);
    if (filtros.exito !== undefined && filtros.exito !== '') {
      params = params.set('exito', String(filtros.exito));
    }

    return this.http.get<RespuestaAuditoria>(this.apiUrl, { params });
  }

  // ─── Obtener KPIs / resumen de auditoría ──────────────────────────────────
  obtenerResumen(): Observable<ResumenAuditoria> {
    return this.http
      .get<{ ok: boolean; datos: ResumenAuditoria }>(`${this.apiUrl}/resumen`)
      .pipe(map(r => r.datos));
  }

  // ─── Lista de acciones disponibles (para filtros) ─────────────────────────
  obtenerAcciones(): Observable<string[]> {
    return this.http
      .get<{ ok: boolean; datos: string[] }>(`${this.apiUrl}/acciones`)
      .pipe(map(r => r.datos));
  }
}
