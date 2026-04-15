// ─── Tipos de acciones auditables ─────────────────────────────────────────────
export type AccionAuditoria =
  | 'auth.login'
  | 'auth.login_fallido'
  | 'auth.logout'
  | 'auth.registro'
  | 'ticket.creado'
  | 'ticket.actualizado'
  | 'ticket.estado_cambiado'
  | 'ticket.asignado'
  | 'ticket.comentario_agregado'
  | 'ticket.archivo_subido'
  | 'ticket.archivo_eliminado'
  | 'ticket.satisfaccion_registrada'
  | 'usuario.creado'
  | 'usuario.actualizado'
  | 'usuario.rol_cambiado'
  | 'usuario.aprobado'
  | 'usuario.desactivado'
  | 'departamento.creado'
  | 'departamento.actualizado'
  | 'departamento.eliminado'
  | 'configuracion.actualizada'
  | 'reporte.generado'
  | 'auditoria.consultada';

export type RecursoAuditoria =
  | 'autenticacion'
  | 'ticket'
  | 'usuario'
  | 'departamento'
  | 'configuracion'
  | 'reporte'
  | 'auditoria';

// ─── Interfaz del registro de auditoría ────────────────────────────────────────
export interface RegistroAuditoria {
  _id:           string;
  uid:           string;
  email:         string;
  nombreUsuario: string;
  rolActor:      string;
  accion:        AccionAuditoria;
  recurso:       RecursoAuditoria;
  recursoId:     string | null;
  detalle:       Record<string, unknown>;
  ip:            string;
  userAgent:     string;
  exito:         boolean;
  errorMensaje:  string | null;
  fechaAccion:   string; // ISO string desde MongoDB
}

// ─── Filtros para consultas ────────────────────────────────────────────────────
export interface FiltrosAuditoria {
  pagina?:  number;
  limite?:  number;
  uid?:     string;
  accion?:  AccionAuditoria | '';
  recurso?: RecursoAuditoria | '';
  exito?:   boolean | '';
  desde?:   string; // YYYY-MM-DD
  hasta?:   string; // YYYY-MM-DD
}

// ─── Respuesta paginada de la API ─────────────────────────────────────────────
export interface RespuestaAuditoria {
  ok:      boolean;
  datos:   RegistroAuditoria[];
  total:   number;
  pagina:  number;
  limite:  number;
  paginas: number;
}

// ─── Resumen / KPIs de auditoría ──────────────────────────────────────────────
export interface ResumenAuditoria {
  totalGeneral:         number;
  ultimas24h:           number;
  fallos24h:            number;
  ultimaSemana:         number;
  loginsFallidos:       number;
  topActores:           { uid: string; email: string; nombre: string; total: number }[];
  actividadPorRecurso:  { _id: string; total: number }[];
}

// ─── Etiquetas legibles para mostrar en UI ────────────────────────────────────
export const ETIQUETA_ACCION: Record<AccionAuditoria, string> = {
  'auth.login':                   'Inicio de sesión',
  'auth.login_fallido':           'Login fallido',
  'auth.logout':                  'Cierre de sesión',
  'auth.registro':                'Registro de cuenta',
  'ticket.creado':                'Ticket creado',
  'ticket.actualizado':           'Ticket actualizado',
  'ticket.estado_cambiado':       'Estado de ticket cambiado',
  'ticket.asignado':              'Ticket asignado',
  'ticket.comentario_agregado':   'Comentario agregado',
  'ticket.archivo_subido':        'Archivo subido',
  'ticket.archivo_eliminado':     'Archivo eliminado',
  'ticket.satisfaccion_registrada':'Satisfacción registrada',
  'usuario.creado':               'Usuario creado',
  'usuario.actualizado':          'Usuario actualizado',
  'usuario.rol_cambiado':         'Rol de usuario cambiado',
  'usuario.aprobado':             'Usuario aprobado',
  'usuario.desactivado':          'Usuario desactivado',
  'departamento.creado':          'Departamento creado',
  'departamento.actualizado':     'Departamento actualizado',
  'departamento.eliminado':       'Departamento eliminado',
  'configuracion.actualizada':    'Configuración actualizada',
  'reporte.generado':             'Reporte generado',
  'auditoria.consultada':         'Auditoría consultada',
};

export const ETIQUETA_RECURSO: Record<RecursoAuditoria, string> = {
  autenticacion: 'Autenticación',
  ticket:        'Ticket',
  usuario:       'Usuario',
  departamento:  'Departamento',
  configuracion: 'Configuración',
  reporte:       'Reporte',
  auditoria:     'Auditoría',
};
