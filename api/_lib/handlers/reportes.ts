import { VercelRequest, VercelResponse } from '@vercel/node';
import { conectarMongoDB } from '../config/database.js';
import { Ticket } from '../models/Ticket.js';
import { Usuario } from '../models/Usuario.js';
import { adminOSoporte, verificarUsuarioActivo } from '../middleware/roles.js';
import * as R from '../utils/respuestas.js';
import { logRequest, logError } from '../utils/logger.js';
import { ESTADO_TICKET, PRIORIDAD, CATEGORIA_TICKET } from '../enums/index.js';

export default async function reportesHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);

  await conectarMongoDB();

  try {
    // Todos los usuarios activos pueden acceder a reportes, con datos acotados al rol
    const ctx = await verificarUsuarioActivo(req, res);
    if (!ctx) return;
    logRequest(req, ctx.uid);

    // Para usuarios normales obtenemos su departamento para acotar las consultas
    let departamentoUsuario: string | null = null;
    if (ctx.role === 'user') {
      const perfil = await Usuario.findOne({ uid: ctx.uid }).select('department');
      departamentoUsuario = perfil?.department ?? null;
    }

    // ── GET /api/reportes/resumen ─────────────────────────────────────────────
    if (pathname === '/api/reportes/resumen' && req.method === 'GET') {
      // Usuarios normales solo ven estadísticas de su propio departamento
      const filtroBase = departamentoUsuario ? { departamento: departamentoUsuario } : {};

      const [porEstado, porPrioridad, porCategoria, totales] = await Promise.all([
        Ticket.aggregate([
          { $match: filtroBase },
          { $group: { _id: '$estado', total: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Ticket.aggregate([
          { $match: filtroBase },
          { $group: { _id: '$prioridad', total: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Ticket.aggregate([
          { $match: filtroBase },
          { $group: { _id: '$categoria', total: { $sum: 1 } } },
          { $sort: { total: -1 } },
        ]),
        Ticket.aggregate([
          { $match: filtroBase },
          {
            $group: {
              _id: null,
              total:     { $sum: 1 },
              abiertos:  { $sum: { $cond: [{ $in: ['$estado', ['nuevo', 'asignado', 'en_proceso', 'en_espera']] }, 1, 0] } },
              resueltos: { $sum: { $cond: [{ $eq: ['$estado', 'resuelto'] }, 1, 0] } },
              cerrados:  { $sum: { $cond: [{ $eq: ['$estado', 'cerrado'] }, 1, 0] } },
              tiempoPromedioMinutos: { $avg: '$tiempoReal' },
              satisfaccionPromedio:  { $avg: '$satisfaccion' },
            },
          },
        ]),
      ]);

      const resumen = totales[0] ?? {
        total: 0, abiertos: 0, resueltos: 0, cerrados: 0,
        tiempoPromedioMinutos: 0, satisfaccionPromedio: 0,
      };

      return R.ok(res, {
        resumen: {
          ...resumen,
          _id: undefined,
          tiempoPromedioHoras: resumen.tiempoPromedioMinutos
            ? Math.round(resumen.tiempoPromedioMinutos / 60)
            : null,
        },
        porEstado:    _agruparA(porEstado),
        porPrioridad: _agruparA(porPrioridad),
        porCategoria: _agruparA(porCategoria),
        // Incluido para que el frontend sepa el alcance del reporte
        departamentoFiltrado: departamentoUsuario ?? null,
      });
    }

    // ── GET /api/reportes/departamento ──────────────────────────────────────
    if (pathname === '/api/reportes/departamento' && req.method === 'GET') {
      // Usuarios normales solo ven su departamento; admin/soporte puede recibir ?departamento=xxx
      const filtroDepartamento: Record<string, unknown> = {};
      if (departamentoUsuario) {
        filtroDepartamento['departamento'] = departamentoUsuario;
      } else {
        const paramDepto = (req.query?.departamento as string) || null;
        if (paramDepto) filtroDepartamento['departamento'] = paramDepto;
      }

      const porDepartamento = await Ticket.aggregate([
        ...(Object.keys(filtroDepartamento).length ? [{ $match: filtroDepartamento }] : []),
        {
          $group: {
            _id: '$departamento',
            total:     { $sum: 1 },
            abiertos:  { $sum: { $cond: [{ $in: ['$estado', ['nuevo', 'asignado', 'en_proceso', 'en_espera']] }, 1, 0] } },
            resueltos: { $sum: { $cond: [{ $eq: ['$estado', 'resuelto'] }, 1, 0] } },
            cerrados:  { $sum: { $cond: [{ $eq: ['$estado', 'cerrado'] }, 1, 0] } },
            tiempoPromedio:       { $avg: '$tiempoReal' },
            satisfaccionPromedio: { $avg: '$satisfaccion' },
          },
        },
        { $sort: { total: -1 } },
        {
          $project: {
            departamento:         '$_id',
            total:                1,
            abiertos:             1,
            resueltos:            1,
            cerrados:             1,
            tiempoPromedioHoras:  { $round: [{ $divide: ['$tiempoPromedio', 60] }, 1] },
            satisfaccionPromedio: { $round: ['$satisfaccionPromedio', 2] },
          },
        },
      ]);

      return R.ok(res, {
        porDepartamento,
        departamentoFiltrado: departamentoUsuario ?? null,
      });
    }

    // ── GET /api/reportes/rendimiento ────────────────────────────────────────
    if (pathname === '/api/reportes/rendimiento' && req.method === 'GET') {
      // Solo admin y soporte pueden ver el rendimiento de agentes
      if (ctx.role === 'user') {
        return R.error(res, 'Se requiere rol de administrador o soporte', 403);
      }

      const porAgente = await Ticket.aggregate([
        { $match: { asignadoAUid: { $exists: true, $ne: null } } },
        {
          $group: {
            _id:   '$asignadoAUid',
            nombre: { $first: '$asignadoANombre' },
            totalAsignados: { $sum: 1 },
            resueltos: { $sum: { $cond: [{ $eq: ['$estado', 'resuelto'] }, 1, 0] } },
            cerrados:  { $sum: { $cond: [{ $eq: ['$estado', 'cerrado'] }, 1, 0] } },
            tiempoPromedioMinutos: { $avg: '$tiempoReal' },
            satisfaccionPromedio:  { $avg: '$satisfaccion' },
            criticos:  { $sum: { $cond: [{ $eq: ['$prioridad', 'critica'] }, 1, 0] } },
            altos:     { $sum: { $cond: [{ $eq: ['$prioridad', 'alta'] }, 1, 0] } },
          },
        },
        { $sort: { resueltos: -1, tiempoPromedioMinutos: 1 } },
        {
          $project: {
            uid:              '$_id',
            nombre:           1,
            totalAsignados:   1,
            resueltos:        1,
            cerrados:         1,
            tiempoPromedioHoras: { $round: [{ $divide: ['$tiempoPromedioMinutos', 60] }, 1] },
            satisfaccionPromedio: { $round: ['$satisfaccionPromedio', 2] },
            criticos:         1,
            altos:            1,
            tasaResolucion: {
              $cond: [
                { $gt: ['$totalAsignados', 0] },
                { $round: [{ $multiply: [{ $divide: ['$resueltos', '$totalAsignados'] }, 100] }, 1] },
                0,
              ],
            },
          },
        },
      ]);

      return R.ok(res, { rendimientoPorAgente: porAgente });
    }

    R.error(res, 'Ruta de reportes no encontrada', 404);
  } catch (err) {
    logError('reportesHandler', err);
    R.errorServidor(res, err);
  }
}

// Convierte [{_id: 'nuevo', total: 5}] → { nuevo: 5 }
function _agruparA(arr: { _id: string; total: number }[]): Record<string, number> {
  return arr.reduce((acc, item) => ({ ...acc, [item._id]: item.total }), {});
}
