import { VercelRequest, VercelResponse } from '@vercel/node';
import { verificarToken } from './autenticacion.js';
import { Usuario } from '../models/Usuario.js';
import type { Rol } from '../enums/index.js';

export interface ContextoAutenticado {
  uid:     string;
  role:    Rol;
  email:   string;
}

/**
 * Verifica el token Y que el usuario tenga uno de los roles permitidos.
 * Si el token es inválido o el rol no está en `rolesPermitidos`, responde
 * automáticamente con 401/403 y devuelve null.
 */
export async function verificarRol(
  req: VercelRequest,
  res: VercelResponse,
  rolesPermitidos: Rol[]
): Promise<ContextoAutenticado | null> {
  const token = await verificarToken(req, res);
  if (!token) return null;

  const usuario = await Usuario.findOne({ uid: token.uid }).select('role email');
  if (!usuario) {
    res.status(401).json({ error: 'Usuario no encontrado en el sistema' });
    return null;
  }

  if (usuario.role === 'inactive') {
    res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    return null;
  }

  if (usuario.role === 'pending') {
    res.status(403).json({ error: 'Cuenta pendiente de aprobación.' });
    return null;
  }

  if (rolesPermitidos.length && !rolesPermitidos.includes(usuario.role as Rol)) {
    res.status(403).json({
      error: `Acceso denegado. Roles permitidos: ${rolesPermitidos.join(', ')}`,
    });
    return null;
  }

  return { uid: token.uid, role: usuario.role as Rol, email: usuario.email };
}

/** Atajo: cualquier usuario activo */
export async function verificarUsuarioActivo(
  req: VercelRequest,
  res: VercelResponse
): Promise<ContextoAutenticado | null> {
  return verificarRol(req, res, ['admin', 'support', 'user']);
}

/** Atajo: solo admin */
export async function soloAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<ContextoAutenticado | null> {
  return verificarRol(req, res, ['admin']);
}

/** Atajo: admin o soporte */
export async function adminOSoporte(
  req: VercelRequest,
  res: VercelResponse
): Promise<ContextoAutenticado | null> {
  return verificarRol(req, res, ['admin', 'support']);
}
