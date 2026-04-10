import { VercelRequest, VercelResponse } from '@vercel/node';
import { conectarMongoDB } from '../config/database.js';
import { Configuracion } from '../models/Configuracion.js';
import { verificarUsuarioActivo, soloAdmin } from '../middleware/roles.js';
import * as R from '../utils/respuestas.js';
import { logRequest, logError } from '../utils/logger.js';

// ─── Campos permitidos para actualización (lista blanca) ─────────────────────
const CAMPOS_PERMITIDOS = new Set([
  'nombreSistema', 'emailSoporte', 'modoMantenimiento',
  'notificacionesEmail', 'notifNuevoTicket', 'notifCambioEstado', 'notifComentario',
  'recordatorioActivo', 'diasRecordatorio',
  'slaBaja', 'slaMedia', 'slaAlta', 'slaCritica',
]);

export default async function configuracionHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);

  await conectarMongoDB();

  try {
    // ── GET /api/configuracion ─────────────────────────────────────────────────
    if (pathname === '/api/configuracion' && req.method === 'GET') {
      const ctx = await verificarUsuarioActivo(req, res);
      if (!ctx) return;
      logRequest(req, ctx.uid);

      // Obtener config existente o devolver valores por defecto (upsert vacío)
      let config = await Configuracion.findOne({ clave: 'sistema' });

      if (!config) {
        // Primera solicitud: crear con valores por defecto
        config = await Configuracion.create({ clave: 'sistema' });
      }

      return R.ok(res, { configuracion: config });
    }

    // ── PUT /api/configuracion ─────────────────────────────────────────────────
    if (pathname === '/api/configuracion' && req.method === 'PUT') {
      const ctx = await soloAdmin(req, res);
      if (!ctx) return;
      logRequest(req, ctx.uid);

      const body = req.body as Record<string, unknown>;

      // Filtrar solo los campos permitidos (evitar inyección de campos del modelo)
      const actualizaciones: Record<string, unknown> = {};
      for (const [clave, valor] of Object.entries(body)) {
        if (CAMPOS_PERMITIDOS.has(clave)) {
          actualizaciones[clave] = valor;
        }
      }

      if (Object.keys(actualizaciones).length === 0) {
        return R.error(res, 'No se proporcionaron campos válidos para actualizar');
      }

      // Validaciones básicas
      if ('diasRecordatorio' in actualizaciones) {
        const dias = Number(actualizaciones['diasRecordatorio']);
        if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
          return R.error(res, 'diasRecordatorio debe ser un entero entre 1 y 365');
        }
        actualizaciones['diasRecordatorio'] = dias;
      }

      for (const campo of ['slaBaja', 'slaMedia', 'slaAlta', 'slaCritica'] as const) {
        if (campo in actualizaciones) {
          const horas = Number(actualizaciones[campo]);
          if (!Number.isInteger(horas) || horas < 1 || horas > 720) {
            return R.error(res, `${campo} debe ser un entero entre 1 y 720 horas`);
          }
          actualizaciones[campo] = horas;
        }
      }

      actualizaciones['updatedBy'] = ctx.uid;

      const config = await Configuracion.findOneAndUpdate(
        { clave: 'sistema' },
        { $set: actualizaciones },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return R.ok(res, { configuracion: config });
    }

    return R.error(res, 'Método no permitido', 405);
  } catch (err) {
    logError('configuracion', err as Error);
    return R.error(res, 'Error interno del servidor', 500);
  }
}
