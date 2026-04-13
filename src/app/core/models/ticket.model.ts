// ─── Tipos base ───────────────────────────────────────────────────────────────

export type EstadoTicket = 'nuevo' | 'asignado' | 'en_proceso' | 'en_espera' | 'resuelto' | 'cerrado';
export type PrioridadTicket = 'baja' | 'media' | 'alta' | 'critica';
export type CategoriaTicket =
  | 'hardware' | 'software' | 'red' | 'accesos'
  | 'correo' | 'impresoras' | 'telefonos' | 'servidores'
  | 'seguridad' | 'otro';

// Alias para compatibilidad con código existente
export type TicketStatus   = EstadoTicket;
export type TicketPriority = PrioridadTicket;
export type TicketCategory = CategoriaTicket;

// ─── Sub-documentos ────────────────────────────────────────────────────────────

export interface IComentario {
  id?: string;
  autorUid: string;
  autorNombre: string;
  texto: string;
  esInterno?: boolean;
  creadoEn: string;
  archivosAdjuntos?: string[]; // URLs en Firebase Storage
}

// Alias para compatibilidad
export type TicketComment = IComentario;

export interface IArchivo {
  _id?: string;  // ID del sub-documento MongoDB (viene como _id del servidor)
  id?: string;
  nombre: string;
  url: string;
  tipo: string;
  tamanio: number;
  creadoEn: string;
}

export interface IHistorialEntrada {
  campo: string;
  valorAntes: string;
  valorDespues: string;
  cambiadoPor: string;
  cambiadoEn: string;
}

export interface IResumenUsuario {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

// Alias para compatibilidad
export type UserProfileSummary = IResumenUsuario;

// ─── Modelo principal ──────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  numero?: number;
  titulo: string;
  descripcion: string;
  estado: EstadoTicket;
  prioridad: PrioridadTicket;
  categoria: CategoriaTicket;
  departamento: string;
  creadoPorUid: string;
  creadoPorNombre: string;
  asignadoAUid?: string;
  asignadoANombre?: string;
  fechaLimite?: string;
  fechaResolucion?: string;
  tiempoReal?: number;    // en minutos (tiempo trabajado real)
  satisfaccion?: number;  // calificación 1-5
  etiquetas?: string[];
  comentarios?: IComentario[];
  archivos?: IArchivo[];
  historial?: IHistorialEntrada[];
  createdAt: string;
  updatedAt: string;
  // Campos extendidos — cargados manualmente en el detail component
  creadoPorUsuario?: IResumenUsuario;
  asignadoUsuario?: IResumenUsuario;
}
