export interface Departamento {
  id: string;
  nombre: string;
  descripcion?: string;
  responsableUid?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Usar Departamento */
export type Department = Departamento;
