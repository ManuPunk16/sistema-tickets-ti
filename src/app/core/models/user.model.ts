import { RolUsuario } from '../enums/roles-usuario.enum';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string;
  photoURL?: string | null;
  role: RolUsuario;
  department?: string;
  position?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  authProvider?: 'email' | 'google';
}
