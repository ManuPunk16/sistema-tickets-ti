import { VercelRequest, VercelResponse } from '@vercel/node';
import { conectarMongoDB } from '../config/database.js';
import { RegistroAuditoria } from '../models/RegistroAuditoria.js';
import { soloAdmin } from '../middleware/roles.js';
import { logRequest } from '../utils/logger.js';
import { registrarAuditoria } from '../utils/registrarAuditoria.js';
import { ACCION_AUDITORIA, RECURSO_AUDITORIA } from '../enums/index.js';
import * as R from '../utils/respuestas.js';

// ─── Helpers de paginación ────────────────────────────────────────────────────
function parsearPaginacion(query: Record<string, string | string[]>) {
  const pagina = Math.max(1, parseInt(String(query.pagina ?? '1')));
  const limite = Math.min(100, Math.max(1, parseInt(String(query.limite ?? '50'))));
  return { pagina, limite, skip: (pagina - 1) * limite };
}

// ─── Handler principal ────────────────────────────────────────────────────────
export default async function auditoriaHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);
  await conectarMongoDB();

  try {
    // ── GET /api/auditoria ────────────────────────────────────────────────────
    // Lista paginada con filtros opcionales (solo admin)
    if (pathname === '/api/auditoria' && req.method === 'GET') {
      const ctx = await soloAdmin(req, res);
      if (!ctx) return;
      logRequest(req, ctx.uid);

      const q = req.query as Record<string, string>;
      const { pagina, limite, skip } = parsearPaginacion(q);

      // Construcción de filtros dinámicos
      const filtro: Record<string, unknown> = {};

      if (q.uid)      filtro['uid']     = q.uid;
      if (q.accion)   filtro['accion']  = q.accion;
      if (q.recurso)  filtro['recurso'] = q.recurso;
      if (q.exito !== undefined) filtro['exito'] = q.exito === 'true';

      // Rango de fechas
      if (q.desde || q.hasta) {
        const rango: Record<string, Date> = {};
        if (q.desde) rango['$gte'] = new Date(q.desde);
        if (q.hasta) {
          const hasta = new Date(q.hasta);
          hasta.setHours(23, 59, 59, 999);
          rango['$lte'] = hasta;
        }
        filtro['fechaAccion'] = rango;
      }

      const [registros, total] = await Promise.all([
        RegistroAuditoria.find(filtro)
          .sort({ fechaAccion: -1 })
          .skip(skip)
          .limit(limite)
          .lean(),
        RegistroAuditoria.countDocuments(filtro),
      ]);

      // Registrar que el admin consultó auditoría
      await registrarAuditoria({
        uid:           ctx.uid,
        email:         ctx.email,
        nombreUsuario: ctx.displayName,
        rolActor:      ctx.role,
        accion:        ACCION_AUDITORIA.AuditoriaConsultada,
        recurso:       RECURSO_AUDITORIA.Auditoria,
        detalle:       { filtros: q, totalResultados: total },
        req,
      });

      return R.paginado(res, registros, total, pagina, limite);
    }

    // ── GET /api/auditoria/acciones ───────────────────────────────────────────
    // Devuelve la lista de valores únicos de accion para filtros en el frontend
    if (pathname === '/api/auditoria/acciones' && req.method === 'GET') {
      const ctx = await soloAdmin(req, res);
      if (!ctx) return;

      const acciones = Object.values(ACCION_AUDITORIA);
      return R.ok(res, { datos: acciones });
    }

    // ── GET /api/auditoria/resumen ────────────────────────────────────────────
    // KPIs rápidos: total por acción, últimas 24h, fallos, etc.
    if (pathname === '/api/auditoria/resumen' && req.method === 'GET') {
      const ctx = await soloAdmin(req, res);
      if (!ctx) return;

      const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const hace7d  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalGeneral,
        ultimas24h,
        fallos24h,
        ultimaSemana,
        loginsFallidos,
      ] = await Promise.all([
        RegistroAuditoria.countDocuments({}),
        RegistroAuditoria.countDocuments({ fechaAccion: { $gte: hace24h } }),
        RegistroAuditoria.countDocuments({ fechaAccion: { $gte: hace24h }, exito: false }),
        RegistroAuditoria.countDocuments({ fechaAccion: { $gte: hace7d } }),
        RegistroAuditoria.countDocuments({
          accion:      ACCION_AUDITORIA.LoginFallido,
          fechaAccion: { $gte: hace24h },
        }),
      ]);

      // Top 5 actores más activos en las últimas 24h
      const topActores = await RegistroAuditoria.aggregate([
        { $match: { fechaAccion: { $gte: hace24h } } },
        { $group: { _id: { uid: '$uid', email: '$email', nombre: '$nombreUsuario' }, total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, uid: '$_id.uid', email: '$_id.email', nombre: '$_id.nombre', total: 1 } },
      ]);

      // Actividad por recurso en las últimas 24h
      const actividadPorRecurso = await RegistroAuditoria.aggregate([
        { $match: { fechaAccion: { $gte: hace24h } } },
        { $group: { _id: '$recurso', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);

      return R.ok(res, {
        datos: {
          totalGeneral,
          ultimas24h,
          fallos24h,
          ultimaSemana,
          loginsFallidos,
          topActores,
          actividadPorRecurso,
        },
      });
    }

    R.noEncontrado(res, 'Endpoint de auditoría');
  } catch (err) {
    R.errorServidor(res, err);
  }
}
