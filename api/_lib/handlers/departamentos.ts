import { VercelRequest, VercelResponse } from '@vercel/node';
import { conectarMongoDB } from '../config/database.js';
import { Departamento } from '../models/Departamento.js';
import { verificarUsuarioActivo, soloAdmin } from '../middleware/roles.js';
import * as R from '../utils/respuestas.js';
import { logRequest, logError } from '../utils/logger.js';

export default async function departamentosHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);

  const matchId = pathname.match(/^\/api\/departamentos\/([^/]+)$/);
  const id = matchId?.[1] ?? null;

  await conectarMongoDB();

  try {
    // ── GET /api/departamentos ───────────────────────────────────────────────
    if (pathname === '/api/departamentos' && req.method === 'GET') {
      const ctx = await verificarUsuarioActivo(req, res);
      if (!ctx) return;
      logRequest(req, ctx.uid);

      const soloActivos = req.query.todos !== 'true' || ctx.role !== 'admin';
      const filtro = soloActivos ? { activo: true } : {};

      const departamentos = await Departamento.find(filtro).sort({ nombre: 1 });
      return R.ok(res, { departamentos });
    }

    // ── POST /api/departamentos ──────────────────────────────────────────────
    if (pathname === '/api/departamentos' && req.method === 'POST') {
      const ctx = await soloAdmin(req, res);
      if (!ctx) return;
      logRequest(req, ctx.uid);

      const { nombre, descripcion, responsableUid } = req.body as {
        nombre: string; descripcion?: string; responsableUid?: string;
      };

      if (!nombre?.trim()) {
        return R.error(res, 'El nombre del departamento es requerido');
      }

      const existente = await Departamento.findOne({ nombre: nombre.trim() });
      if (existente) {
        return R.error(res, `Ya existe un departamento con el nombre "${nombre.trim()}"`, 409);
      }

      const departamento = await Departamento.create({
        nombre:         nombre.trim(),
        descripcion:    descripcion?.trim(),
        responsableUid: responsableUid ?? undefined,
        activo:         true,
      });

      return R.creado(res, { departamento });
    }

    // ── GET /api/departamentos/:id ───────────────────────────────────────────
    if (id && req.method === 'GET') {
      const ctx = await verificarUsuarioActivo(req, res);
      if (!ctx) return;
      logRequest(req, ctx.uid);

      const departamento = await Departamento.findById(id);
      if (!departamento) return R.noEncontrado(res, 'Departamento');

      return R.ok(res, { departamento });
    }

    // ── PUT /api/departamentos/:id ───────────────────────────────────────────
    if (id && req.method === 'PUT') {
      const ctx = await soloAdmin(req, res);
      if (!ctx) return;

      const departamento = await Departamento.findById(id);
      if (!departamento) return R.noEncontrado(res, 'Departamento');

      const { nombre, descripcion, responsableUid } = req.body as Partial<{
        nombre: string; descripcion: string; responsableUid: string;
      }>;

      if (nombre?.trim() && nombre.trim() !== departamento.nombre) {
        const duplicado = await Departamento.findOne({ nombre: nombre.trim(), _id: { $ne: id } });
        if (duplicado) {
          return R.error(res, `Ya existe un departamento con el nombre "${nombre.trim()}"`, 409);
        }
        departamento.nombre = nombre.trim();
      }
      if (descripcion !== undefined) departamento.descripcion    = descripcion.trim();
      if (responsableUid !== undefined) departamento.responsableUid = responsableUid;

      await departamento.save();
      return R.ok(res, { departamento });
    }

    // ── DELETE /api/departamentos/:id (soft delete) ──────────────────────────
    if (id && req.method === 'DELETE') {
      const ctx = await soloAdmin(req, res);
      if (!ctx) return;

      const departamento = await Departamento.findById(id);
      if (!departamento) return R.noEncontrado(res, 'Departamento');

      if (!departamento.activo) {
        return R.error(res, 'El departamento ya está inactivo');
      }

      departamento.activo = false;
      await departamento.save();

      return R.ok(res, { mensaje: `Departamento "${departamento.nombre}" desactivado` });
    }

    R.error(res, 'Ruta de departamentos no encontrada', 404);
  } catch (err) {
    logError('departamentosHandler', err);
    R.errorServidor(res, err);
  }
}
