// ─── Roles de usuario ─────────────────────────────────────────────────────────
export const ROL = {
  Admin:    'admin',
  Support:  'support',
  User:     'user',
  Pending:  'pending',
  Inactive: 'inactive',
} as const;
export type Rol = (typeof ROL)[keyof typeof ROL];

// ─── Estados del ticket ────────────────────────────────────────────────────────
export const ESTADO_TICKET = {
  Nuevo:      'nuevo',
  Asignado:   'asignado',
  EnProceso:  'en_proceso',
  EnEspera:   'en_espera',
  Resuelto:   'resuelto',
  Cerrado:    'cerrado',
} as const;
export type EstadoTicket = (typeof ESTADO_TICKET)[keyof typeof ESTADO_TICKET];

// ─── Prioridades ───────────────────────────────────────────────────────────────
export const PRIORIDAD = {
  Baja:     'baja',
  Media:    'media',
  Alta:     'alta',
  Critica:  'critica',
} as const;
export type Prioridad = (typeof PRIORIDAD)[keyof typeof PRIORIDAD];

// ─── Categorías de ticket ──────────────────────────────────────────────────────
export const CATEGORIA_TICKET = {
  Hardware:         'hardware',
  Software:         'software',
  Red:              'red',
  Accesos:          'accesos',
  Correo:           'correo',
  Impresoras:       'impresoras',
  Telefonos:        'telefonos',
  Servidores:       'servidores',
  Seguridad:        'seguridad',
  Otro:             'otro',
} as const;
export type CategoriaTicket = (typeof CATEGORIA_TICKET)[keyof typeof CATEGORIA_TICKET];

// ─── Tiempo estimado de resolución SLA (horas) ───────────────────────────────
export const SLA_HORAS: Record<Prioridad, number> = {
  baja:    72,
  media:   24,
  alta:    8,
  critica: 2,
};

// ─── Roles que pueden gestionar tickets de otros ──────────────────────────────
export const ROLES_SOPORTE: Rol[] = [ROL.Admin, ROL.Support];
export const ROLES_ACTIVOS: Rol[] = [ROL.Admin, ROL.Support, ROL.User];
