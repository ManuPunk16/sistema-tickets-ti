import { VercelRequest, VercelResponse } from '@vercel/node';
import { verificarToken, firebaseAdmin } from '../middleware/autenticacion.js';
import { Usuario } from '../models/Usuario.js';
import { conectarMongoDB } from '../config/database.js';

// Helper reutilizable: verifica token + rol admin en una sola llamada
async function verificarAdmin(req: VercelRequest, res: VercelResponse) {
  const token = await verificarToken(req, res);
  if (!token) return null;

  const solicitante = await Usuario.findOne({ uid: token.uid }).select('role');
  if (!solicitante || solicitante.role !== 'admin') {
    res.status(403).json({ error: 'Solo los administradores pueden realizar esta acción' });
    return null;
  }
  return solicitante;
}

export default async function usuariosHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);

  // Extraer :uid y :accion de la URL
  const matchAccion = pathname.match(/^\/api\/usuarios\/([^/]+)\/(activar|desactivar)$/);
  const matchBase   = pathname.match(/^\/api\/usuarios\/([^/]+)$/);
  const uid    = matchAccion?.[1] ?? matchBase?.[1] ?? null;
  const accion = matchAccion?.[2] ?? null;

  await conectarMongoDB();

  // ── GET /api/usuarios ────────────────────────────────────────────────────
  if (pathname === '/api/usuarios' && req.method === 'GET') {
    if (!await verificarAdmin(req, res)) return;

    const { rol, pagina = '1', limite = '50' } = req.query as Record<string, string>;
    const filtro: Record<string, unknown> = {};
    if (rol) filtro['role'] = rol;

    const paginaNum  = Math.max(1, parseInt(pagina));
    const limiteNum  = Math.min(100, parseInt(limite));

    const [usuarios, total] = await Promise.all([
      Usuario.find(filtro).select('-__v').sort({ createdAt: -1 })
        .skip((paginaNum - 1) * limiteNum).limit(limiteNum),
      Usuario.countDocuments(filtro),
    ]);

    res.status(200).json({ ok: true, usuarios, total, pagina: paginaNum, limite: limiteNum });
    return;
  }

  // ── POST /api/usuarios ───────────────────────────────────────────────────
  // El admin crea el usuario completo: Firebase Auth + MongoDB en un solo paso
  if (pathname === '/api/usuarios' && req.method === 'POST') {
    if (!await verificarAdmin(req, res)) return;

    const { email, displayName, password, role, department, position } = req.body as {
      email: string; displayName: string; password: string;
      role: 'admin' | 'support' | 'user'; department?: string; position?: string;
    };

    if (!email || !displayName || !password || !role) {
      res.status(400).json({ error: 'Campos requeridos: email, displayName, password, role' });
      return;
    }
    if (!['admin', 'support', 'user'].includes(role)) {
      res.status(400).json({ error: 'Rol inválido. Permitidos: admin, support, user' });
      return;
    }

    // Verificar que no exista en MongoDB antes de llamar a Firebase
    const yaExiste = await Usuario.findOne({ email });
    if (yaExiste) {
      res.status(409).json({ error: 'El correo ya existe en la base de datos' });
      return;
    }

    // Crear en Firebase Auth (servidor, sin exponer contraseña al cliente)
    let firebaseUser;
    try {
      firebaseUser = await firebaseAdmin.auth().createUser({
        email,
        displayName,
        password,
        emailVerified: true,      // No necesita verificar correo
        disabled: false,
      });
    } catch (err: any) {
      const codigo = err.code === 'auth/email-already-exists' ? 409 : 500;
      res.status(codigo).json({ error: err.message });
      return;
    }

    // Crear en MongoDB
    const nuevoUsuario = await Usuario.create({
      uid: firebaseUser.uid,
      email, displayName, role,
      department: department || undefined,
      position: position || undefined,
      authProvider: 'email',
      lastLogin: new Date(),
    });

    res.status(201).json({ ok: true, usuario: nuevoUsuario });
    return;
  }

  // ── GET /api/usuarios/:uid ───────────────────────────────────────────────
  if (uid && !accion && req.method === 'GET') {
    if (!await verificarAdmin(req, res)) return;

    const usuario = await Usuario.findOne({ uid }).select('-__v');
    if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

    res.status(200).json({ ok: true, usuario });
    return;
  }

  // ── PUT /api/usuarios/:uid ───────────────────────────────────────────────
  if (uid && !accion && req.method === 'PUT') {
    if (!await verificarAdmin(req, res)) return;

    const { displayName, role, department, position } = req.body as {
      displayName?: string;
      role?: 'admin' | 'support' | 'user' | 'pending' | 'inactive';
      department?: string;
      position?: string;
    };

    const cambios: Record<string, unknown> = {};
    if (displayName)  cambios['displayName'] = displayName;
    if (role && ['admin', 'support', 'user', 'pending', 'inactive'].includes(role)) {
      cambios['role'] = role;
    }
    if (department !== undefined) cambios['department'] = department || undefined;
    if (position   !== undefined) cambios['position']   = position   || undefined;

    if (!Object.keys(cambios).length) {
      res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar' });
      return;
    }

    const usuario = await Usuario.findOneAndUpdate(
      { uid }, { $set: cambios }, { new: true, select: '-__v' }
    );
    if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

    // Sincronizar displayName en Firebase Auth si cambió
    if (displayName) {
      await firebaseAdmin.auth().updateUser(uid, { displayName }).catch(() => {});
    }

    res.status(200).json({ ok: true, usuario });
    return;
  }

  // ── PATCH /api/usuarios/:uid/activar ────────────────────────────────────
  if (uid && accion === 'activar' && req.method === 'PATCH') {
    if (!await verificarAdmin(req, res)) return;

    const { role = 'user' } = (req.body ?? {}) as { role?: 'admin' | 'support' | 'user' };
    if (!['admin', 'support', 'user'].includes(role)) {
      res.status(400).json({ error: 'Rol inválido para activación' });
      return;
    }

    const usuario = await Usuario.findOneAndUpdate(
      { uid }, { $set: { role } }, { new: true, select: '-__v' }
    );
    if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

    // Rehabilitar en Firebase Auth
    await firebaseAdmin.auth().updateUser(uid, { disabled: false }).catch(() => {});

    res.status(200).json({ ok: true, usuario, mensaje: `Usuario activado con rol "${role}"` });
    return;
  }

  // ── PATCH /api/usuarios/:uid/desactivar ─────────────────────────────────
  if (uid && accion === 'desactivar' && req.method === 'PATCH') {
    if (!await verificarAdmin(req, res)) return;

    const usuario = await Usuario.findOneAndUpdate(
      { uid }, { $set: { role: 'inactive' } }, { new: true, select: '-__v' }
    );
    if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

    // Deshabilitar en Firebase Auth → revoca sesiones activas
    await firebaseAdmin.auth().updateUser(uid, { disabled: true }).catch(() => {});

    res.status(200).json({ ok: true, usuario, mensaje: 'Usuario desactivado correctamente' });
    return;
  }

  // ── DELETE /api/usuarios/:uid ────────────────────────────────────────────
  if (uid && !accion && req.method === 'DELETE') {
    if (!await verificarAdmin(req, res)) return;

    const usuario = await Usuario.findOneAndDelete({ uid });
    if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

    // Eliminar de Firebase Auth
    await firebaseAdmin.auth().deleteUser(uid).catch(() => {});

    res.status(200).json({ ok: true, mensaje: 'Usuario eliminado correctamente' });
    return;
  }

  res.status(404).json({ error: 'Ruta de usuarios no encontrada', pathname });
}
