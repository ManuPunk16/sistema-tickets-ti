import { VercelRequest, VercelResponse } from '@vercel/node';
import { verificarToken } from '../middleware/autenticacion.js';
import { Usuario } from '../models/Usuario.js';
import { conectarMongoDB } from '../config/database.js';
import { registrarAuditoria } from '../utils/registrarAuditoria.js';
import { ACCION_AUDITORIA, RECURSO_AUDITORIA } from '../enums/index.js';

export default async function authHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);

  // POST /api/auth/verificar — llamado tras cada login (email o Google)
  if (pathname === '/api/auth/verificar' && req.method === 'POST') {
    await conectarMongoDB();

    const tokenDecodificado = await verificarToken(req, res);
    if (!tokenDecodificado) return;

    const { esRestauracion } = req.body as { esRestauracion?: boolean };
    const { uid, email, name, picture, firebase } = tokenDecodificado;
    const authProvider = firebase.sign_in_provider === 'google.com' ? 'google' : 'email';

    let usuario = await Usuario.findOne({ uid });

    // Si no se encontró por UID, buscar por email (puede haber un UID desactualizado en BD)
    if (!usuario && email) {
      const usuarioPorEmail = await Usuario.findOne({ email });
      if (usuarioPorEmail) {
        // Actualizar el UID al correcto de Firebase y continuar
        usuarioPorEmail.uid = uid;
        await usuarioPorEmail.save();
        usuario = usuarioPorEmail;
      }
    }

    if (!usuario) {
      // Primer acceso genuino: crear como 'pending'
      usuario = await Usuario.create({
        uid,
        email: email || '',
        displayName: name || email?.split('@')[0] || '',
        photoURL: picture || undefined,
        role: 'pending',
        authProvider,
        lastLogin: new Date(),
      });

      res.status(200).json({
        ok: true,
        usuario,
        esNuevo: true,
        mensaje: 'Cuenta creada. Pendiente de aprobación por un administrador.',
      });
      return;
    }

    if (usuario.role === 'inactive') {
      res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
      return;
    }

    if (usuario.role === 'pending') {
      res.status(403).json({ error: 'Cuenta pendiente de aprobación por un administrador.' });
      return;
    }

      // Actualizar último login
      usuario.lastLogin = new Date();
      if (picture && !usuario.photoURL) usuario.photoURL = picture;
      await usuario.save();

      // Registrar login en auditoría solo cuando es un login explícito del usuario
      // (esRestauracion=true indica recarga de página, no se debe registrar como nuevo login)
      if (!esRestauracion) {
        await registrarAuditoria({
          uid:           usuario.uid,
          email:         usuario.email,
          nombreUsuario: usuario.displayName,
          rolActor:      usuario.role,
          accion:        ACCION_AUDITORIA.Login,
          recurso:       RECURSO_AUDITORIA.Autenticacion,
          detalle:       { authProvider },
          req,
        });
      }

      res.status(200).json({ ok: true, usuario, esNuevo: false });
    return;
  }

  // GET /api/auth/perfil — obtener perfil del usuario actual
  if (pathname === '/api/auth/perfil' && req.method === 'GET') {
    await conectarMongoDB();

    const tokenDecodificado = await verificarToken(req, res);
    if (!tokenDecodificado) return;

    const usuario = await Usuario.findOne({ uid: tokenDecodificado.uid });
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado en la base de datos' });
      return;
    }

    res.status(200).json({ ok: true, usuario });
    return;
  }

  // POST /api/auth/registrar — solo admins pueden crear usuarios con rol específico
  if (pathname === '/api/auth/registrar' && req.method === 'POST') {
    await conectarMongoDB();

    // Verificar que quien llama es admin
    const tokenDecodificado = await verificarToken(req, res);
    if (!tokenDecodificado) return;

    const adminUsuario = await Usuario.findOne({ uid: tokenDecodificado.uid });
    if (!adminUsuario || adminUsuario.role !== 'admin') {
      res.status(403).json({ error: 'Solo administradores pueden registrar usuarios' });
      return;
    }

    const { uid, email, displayName, role, department, position } = req.body as {
      uid: string;
      email: string;
      displayName: string;
      role: 'admin' | 'support' | 'user';
      department?: string;
      position?: string;
    };

    if (!uid || !email || !displayName || !role) {
      res.status(400).json({ error: 'Faltan campos requeridos: uid, email, displayName, role' });
      return;
    }

    const yaExiste = await Usuario.findOne({ uid });
    if (yaExiste) {
      res.status(409).json({ error: 'El usuario ya existe en la base de datos' });
      return;
    }

    const nuevoUsuario = await Usuario.create({
      uid,
      email,
      displayName,
      role,
      department: department || undefined,
      position: position || undefined,
      authProvider: 'email',
      lastLogin: new Date(),
    });

    res.status(201).json({ ok: true, usuario: nuevoUsuario });
    return;
  }

  res.status(404).json({ error: 'Ruta de auth no encontrada', pathname });
}
