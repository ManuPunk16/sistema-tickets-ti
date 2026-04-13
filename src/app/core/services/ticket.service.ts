import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, of, forkJoin, map, catchError, switchMap } from 'rxjs';
import {
  Storage,
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from '@angular/fire/storage';

import { environment } from '../../../environments/environment';
import {
  Ticket,
  EstadoTicket,
  IComentario,
  IArchivo,
  IHistorialEntrada,
} from '../models/ticket.model';

// ─── Tipos de respuesta del API ────────────────────────────────────────────────

interface RespuestaListaTickets {
  ok: boolean;
  datos: Record<string, unknown>[];
  total: number;
  pagina: number;
  limite: number;
  paginas: number;
}

interface RespuestaTicket {
  ok: boolean;
  ticket: Record<string, unknown>;
}

interface RespuestaEliminacion {
  ok: boolean;
  mensaje: string;
}

// ─── Filtros disponibles para listar tickets ───────────────────────────────────

export interface FiltrosTickets {
  pagina?: number;
  limite?: number;
  estado?: EstadoTicket;
  prioridad?: string;
  categoria?: string;
  departamento?: string;
  asignadoAUid?: string;
  creadoPorUid?: string;
  todos?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private http    = inject(HttpClient);
  private storage = inject(Storage);

  private readonly apiUrl = `${environment.apiUrl}/tickets`;

  // ─── Función de mapeo interno ──────────────────────────────────────────────

  private mapearTicket(datos: Record<string, unknown>): Ticket {
    return {
      id:              (datos['_id'] ?? datos['id']) as string,
      numero:          datos['numero'] as number | undefined,
      titulo:          datos['titulo'] as string,
      descripcion:     datos['descripcion'] as string,
      estado:          datos['estado'] as EstadoTicket,
      prioridad:       datos['prioridad'] as Ticket['prioridad'],
      categoria:       datos['categoria'] as Ticket['categoria'],
      departamento:    datos['departamento'] as string,
      creadoPorUid:    datos['creadoPorUid'] as string,
      creadoPorNombre: datos['creadoPorNombre'] as string,
      asignadoAUid:    datos['asignadoAUid'] as string | undefined,
      asignadoANombre: datos['asignadoANombre'] as string | undefined,
      fechaLimite:     datos['fechaLimite'] as string | undefined,
      fechaResolucion: datos['fechaResolucion'] as string | undefined,
      tiempoReal:      datos['tiempoReal'] as number | undefined,
      satisfaccion:    datos['satisfaccion'] as number | undefined,
      etiquetas:       datos['etiquetas'] as string[] | undefined,
      comentarios:     datos['comentarios'] as IComentario[] | undefined,
      archivos:        datos['archivos'] as IArchivo[] | undefined,
      historial:       datos['historial'] as IHistorialEntrada[] | undefined,
      createdAt:       datos['createdAt'] as string,
      updatedAt:       datos['updatedAt'] as string,
    };
  }

  // ─── Métodos canónicos ─────────────────────────────────────────────────────

  obtenerTickets(filtros?: FiltrosTickets): Observable<Ticket[]> {
    let params = new HttpParams();
    if (filtros?.pagina)       params = params.set('pagina',       filtros.pagina.toString());
    if (filtros?.limite)       params = params.set('limite',       filtros.limite.toString());
    if (filtros?.estado)       params = params.set('estado',       filtros.estado);
    if (filtros?.prioridad)    params = params.set('prioridad',    filtros.prioridad);
    if (filtros?.categoria)    params = params.set('categoria',    filtros.categoria);
    if (filtros?.departamento) params = params.set('departamento', filtros.departamento);
    if (filtros?.asignadoAUid) params = params.set('asignadoAUid', filtros.asignadoAUid);
    if (filtros?.creadoPorUid) params = params.set('creadoPorUid', filtros.creadoPorUid);
    if (filtros?.todos)        params = params.set('todos',        'true');

    return this.http.get<RespuestaListaTickets>(this.apiUrl, { params }).pipe(
      map(res => res.datos.map(d => this.mapearTicket(d)))
    );
  }

  obtenerTicketPorId(id: string): Observable<Ticket | null> {
    return this.http.get<RespuestaTicket>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.ok ? this.mapearTicket(res.ticket) : null)
    );
  }

  crearTicket(datos: Partial<Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>>): Observable<string> {
    return this.http.post<RespuestaTicket>(this.apiUrl, datos).pipe(
      map(res => this.mapearTicket(res.ticket).id)
    );
  }

  actualizarTicket(id: string, datos: Partial<Omit<Ticket, 'id'>>): Observable<Ticket> {
    return this.http.put<RespuestaTicket>(`${this.apiUrl}/${id}`, datos).pipe(
      map(res => this.mapearTicket(res.ticket))
    );
  }

  eliminarTicket(id: string): Observable<string> {
    return this.http.delete<RespuestaEliminacion>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.mensaje)
    );
  }

  agregarComentario(id: string, texto: string, esInterno = false): Observable<Ticket> {
    return this.http.post<RespuestaTicket>(`${this.apiUrl}/${id}/comentarios`, { texto, esInterno }).pipe(
      map(res => this.mapearTicket(res.ticket))
    );
  }

  asignarTicket(id: string, uid: string, nombre: string): Observable<Ticket> {
    return this.http.patch<RespuestaTicket>(`${this.apiUrl}/${id}/asignar`, { asignadoAUid: uid }).pipe(
      map(res => this.mapearTicket(res.ticket))
    );
  }

  cambiarEstado(id: string, estado: EstadoTicket, nota?: string): Observable<Ticket> {
    return this.http.patch<RespuestaTicket>(`${this.apiUrl}/${id}/estado`, { estado, nota }).pipe(
      map(res => this.mapearTicket(res.ticket))
    );
  }

  calificarTicket(id: string, satisfaccion: number): Observable<Ticket> {
    return this.http.post<RespuestaTicket>(`${this.apiUrl}/${id}/satisfaccion`, { satisfaccion }).pipe(
      map(res => this.mapearTicket(res.ticket))
    );
  }

  // ─── Métodos legacy (compatibilidad con componentes existentes) ────────────

  /** @deprecated Usar obtenerTickets({ estado, departamento }) */
  getAllTickets(estadoFiltro?: EstadoTicket, departamentoFiltro?: string): Observable<Ticket[]> {
    return this.obtenerTickets({
      estado:       estadoFiltro,
      departamento: departamentoFiltro,
      todos:        true,
    });
  }

  /** @deprecated Usar obtenerTickets({ creadoPorUid: userId }) */
  getUserTickets(userId: string): Observable<Ticket[]> {
    return this.obtenerTickets({ creadoPorUid: userId, todos: true });
  }

  /** @deprecated Usar obtenerTickets({ asignadoAUid: supportId }) */
  getAssignedTickets(supportId: string): Observable<Ticket[]> {
    return this.obtenerTickets({ asignadoAUid: supportId, todos: true });
  }

  /** @deprecated Usar obtenerTicketPorId(id) */
  getTicketById(id: string): Observable<Ticket | null> {
    return this.obtenerTicketPorId(id);
  }

  /** @deprecated Usar crearTicket(datos) */
  createTicket(datos: Partial<Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>>): Observable<string> {
    return this.crearTicket(datos);
  }

  /** @deprecated Usar actualizarTicket(id, datos) */
  updateTicket(id: string, datos: Partial<Ticket>): Observable<Ticket> {
    return this.actualizarTicket(id, datos);
  }

  /** @deprecated Usar cambiarEstado(id, estado, nota) */
  updateTicketStatus(id: string, estado: EstadoTicket, nota?: string): Observable<Ticket> {
    return this.cambiarEstado(id, estado, nota);
  }

  /** @deprecated Usar agregarComentario(id, texto) */
  addComment(id: string, texto: string, _adjuntos: File[] = []): Observable<Ticket> {
    return this.agregarComentario(id, texto);
  }

  /** @deprecated Usar agregarComentario(id, texto) */
  addCommentWithAttachments(id: string, texto: string, _urlsAdjuntos: string[]): Observable<Ticket> {
    return this.agregarComentario(id, texto);
  }

  // ─── Firebase Storage (no se migra a REST) ────────────────────────────────

  async uploadAttachment(ticketId: string, archivo: File): Promise<string> {
    const timestamp = Date.now();
    const ruta = `tickets/${ticketId}/attachments/${timestamp}_${archivo.name}`;
    const archivoRef = ref(this.storage, ruta);
    const resultado  = await uploadBytes(archivoRef, archivo);
    return getDownloadURL(resultado.ref);
  }

  eliminarArchivoDeTicket(ticketId: string, archivo: IArchivo): Observable<Ticket> {
    const archivoId = archivo._id ?? archivo.id ?? '';
    // Intenta borrar de Firebase Storage; si ya no existe, continúa de todas formas
    const borrarStorage$ = from(deleteObject(ref(this.storage, archivo.url))).pipe(
      catchError(() => of(undefined))
    );
    return borrarStorage$.pipe(
      switchMap(() =>
        this.http.delete<RespuestaTicket>(`${this.apiUrl}/${ticketId}/archivos/${archivoId}`)
      ),
      map(res => this.mapearTicket(res.ticket))
    );
  }

  deleteAttachment(url: string): Observable<void> {
    return from(deleteObject(ref(this.storage, url)));
  }

  uploadFiles(ticketId: string, archivos: File[]): Observable<string[]> {
    if (!archivos || archivos.length === 0) return of([]);
    const subidas$ = archivos.map(a => from(this.uploadAttachment(ticketId, a)));
    return forkJoin(subidas$);
  }
}
