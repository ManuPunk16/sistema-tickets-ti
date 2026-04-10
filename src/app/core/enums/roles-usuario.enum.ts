export enum RolUsuario {
  Admin    = 'admin',
  Support  = 'support',
  User     = 'user',
  Pending  = 'pending',
  Inactive = 'inactive',
}

/** Solo los roles que se pueden asignar desde el formulario */
export const ROLES_ASIGNABLES: RolUsuario[] = [
  RolUsuario.Admin,
  RolUsuario.Support,
  RolUsuario.User,
];

export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  [RolUsuario.Admin]:    'Administrador',
  [RolUsuario.Support]:  'Soporte',
  [RolUsuario.User]:     'Usuario',
  [RolUsuario.Pending]:  'Pendiente',
  [RolUsuario.Inactive]: 'Inactivo',
};

export const CLASE_ROL: Record<RolUsuario, string> = {
  [RolUsuario.Admin]:    'bg-indigo-100 text-indigo-800',
  [RolUsuario.Support]:  'bg-green-100 text-green-800',
  [RolUsuario.User]:     'bg-gray-100 text-gray-800',
  [RolUsuario.Pending]:  'bg-yellow-100 text-yellow-800',
  [RolUsuario.Inactive]: 'bg-red-100 text-red-800',
};
