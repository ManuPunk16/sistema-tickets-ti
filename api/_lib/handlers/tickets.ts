import { VercelRequest, VercelResponse } from '@vercel/node';
import { conectarMongoDB } from '../config/database.js';
import { Ticket } from '../models/Ticket.js';
import { Departamento } from '../models/Departamento.js';
import {
  verificarUsuarioActivo,
  adminOSoporte,
  soloAdmin,
} from '../middleware/roles.js';
import { limitadorEscritura } from '../middleware/rateLimiter.js';
import * as R from '../utils/respuestas.js';
import { logRequest, logError } from '../utils/logger.js';
import {
  ESTADO_TICKET,
  PRIORIDAD,
  CATEGORIA_TICKET,
  SLA_HORAS,
  EstadoTicket,
} from '../enums/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsearPaginacion(query: Record<string, string | string[]>) {
  const pagina  = Math.max(1, parseInt(String(query.pagina  ?? '1')));
  const limite  = Math.min(100, Math.max(1, parseInt(String(query.limite ?? '25'))));
  return { pagina, limite, skip: (pagina - 1) * limite };
}

function calcularFechaLimite(prioridad: string): Date {
  const horas = SLA_HORAS[prioridad as keyof typeof SLA_HORAS] ?? 24;
  return new Date(Date.now() + horas * 60 * 60 * 1000);
}

// ─── Rutas de transición de estado válidas ────────────────────────────────────
const TRANSICIONES: Record<EstadoTicket, EstadoTicket[]> = {
  nuevo:      ['asignado', 'cerrado'],
  asignado:   ['en_proceso', 'en_espera', 'cerrado'],
  en_proceso: ['en_espera', 'resuelto', 'cerrado'],
  en_espera:  ['en_proceso', 'cerrado'],
  resuelto:   ['cerrado'],
  cerrado:    [],
};

// ─── Handler principal ────────────────────────────────────────────────────────
export default async function ticketsHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);

  // Extraer segmentos: /api/tickets/:id y /api/tickets/:id/comentarios, etc.
  const matchAccion = pathname.match(/^\/api\/tickets\/([^/]+)\/(comentarios|archivos|asignar|estado|satisfaccion)$/);
  const matchBase   = pathname.match(/^\/api\/tickets\/([^/]+)$/);
  const id     = matchAccion?.[1] ?? matchBase?.[1] ?? null;
  const accion = matchAccion?.[2] ?? null;

  await conectarMongoDB();

  try {
    // ── GET /api/tickets ─────────────────────────────────────────────────────
    if (pathname === '/api/tickets' && req.method === 'GET') {
      const ctx = await verificarUsuarioActivo(req, res);
      if (!ctx) return;
      logRequest(req, ctx.uid);

      const q = req.query as Record<string, string>;
      const { pagina, limite, skip } = parsearPaginacion(q);

      const filtro: Record<string, unknown> = {};

      // Usuarios normales solo ven sus tickets
      if (ctx.role === 'user') {
        filtro['creadoPorUid'] = ctx.uid;
      } else {
        // Soporte/admin pueden filtrar
        if (q.estado)        filtro['estado']       = q.estado;
        if (q.prioridad)     filtro['prioridad']     = q.prioridad;
        if (q.categoria)     filtro['categoria']     = q.categoria;
        if (q.departamento)  filtro['departamento']  = q.departamento;
        if (q.asignadoAUid)  filtro['asignadoAUid']  = q.asignadoAUid;
        if (q.creadoPorUid)  filtro['creadoPorUid']  = q.creadoPorUid;
        // Soporte solo ve los asignados a él o sin asignar (a menos que sea admin)
        if (ctx.role === 'support' && !q.todos) {
          filtro['$or'] = [{ asignadoAUid: ctx.uid }, { asignadoAUid: { $exists: false } }];
        }
      }

      const [tickets, total] = await Promise.all([
        Ticket.find(filtro)
          .select('-comentarios -archivos -historial')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limite),
        Ticket.countDocuments(filtro),
      ]);

      return R.paginado(res, tickets, total, pagina, limite);
    }

    // ── POST /api/tickets ────────────────────────────────────────────────────
    if (pathname === '/api/tickets' && req.method === 'POST') {
      if (!limitadorEscritura(req, res)) return;
      const ctx = await verificarUsuarioActivo(req, res);
      if (!ctx) return;
      logRequest(req, ctx.uid);

      const { titulo, descripcion, categoria, departamento, prioridad, etiquetas } = req.body as {
        titulo: string; descripcion: string; categoria: string;
        departamento: string; prioridad?: string; etiquetas?: string[];
      };

      if (!titulo?.trim() || !descripcion?.trim() || !categoria || !departamento) {
        return R.error(res, 'Campos requeridos: titulo, descripcion, categoria, departamento');
      }

      if (!Object.values(CATEGORIA_TICKET).includes(categoria as any)) {
        return R.error(res, `Categoría inválida. Opciones: ${Object.values(CATEGORIA_TICKET).join(', ')}`);
      }

      const depExiste = await Departamento.findOne({ nombre: departamento, activo: true });
      if (!depExiste) {
        return R.error(res, `El departamento "${departamento}" no existe o no está activo`);
      }

      const prio = (prioridad && Object.values(PRIORIDAD).includes(prioridad as any))
        ? prioridad
        : PRIORIDAD.Media;

      // Obtener nombre del solicitante
      const { Usuario } = await import('../models/Usuario.js');
      const creador = await Usuario.findOne({ uid: ctx.uid }).select('displayName email');
      const nombreCreador = creador?.displayName || creador?.email || ctx.uid;

      const ticket = await Ticket.create({
        titulo:           titulo.trim(),
        descripcion:      descripcion.trim(),
        categoria,
        departamento,
        prioridad:        prio,
        estado:           ESTADO_TICKET.Nuevo,
        creadoPorUid:     ctx.uid,
        creadoPorNombre:  nombreCreador,
        fechaLimite:      calcularFechaLimite(prio),
        etiquetas:        etiquetas ?? [],
      });

      return R.creado(res, { ticket });
    }

    // ── GET /api/tickets/:id ─────────────────────────────────────────────────
    if (id && !accion && req.method === 'GET') {
      const ctx = await verificarUsuarioActivo(req, res);
      if (!ctx) return;
      logRequest(req, ctx.uid);

      const ticket = await Ticket.findById(id);
      if (!ticket) return R.noEncontrado(res, 'Ticket');

      // Usuario solo puede ver sus propios tickets
      if (ctx.role === 'user' && ticket.creadoPorUid !== ctx.uid) {
        return R.prohibido(res);
      }

      return R.ok(res, { ticket });
    }

    // ── PUT /api/tickets/:id ─────────────────────────────────────────────────
    if (id && !accion && req.method === 'PUT') {
      const ctx = await adminOSoporte(req, res);
      if (!ctx) return;

      const ticket = await Ticket.findById(id);
      if (!ticket) return R.noEncontrado(res, 'Ticket');

      const { titulo, descripcion, prioridad, categoria, etiquetas } = req.body as Partial<{
        titulo: string; descripcion: string; prioridad: string;
        categoria: string; etiquetas: string[];
      }>;

      const cambios: Partial<typeof ticket>[] = [];

      if (titulo?.trim())       { ticket.titulo       = titulo.trim(); }
      if (descripcion?.trim())  { ticket.descripcion  = descripcion.trim(); }
      if (prioridad && Object.values(PRIORIDAD).includes(prioridad as any)) {
        if (ticket.prioridad !== prioridad) {
          ticket.historial.push({
            campo: 'prioridad', valorAntes: ticket.prioridad,
            valorDespues: prioridad, cambiadoPor: ctx.uid, cambiadoEn: new Date(),
          });
          ticket.prioridad = prioridad as any;
          ticket.fechaLimite = calcularFechaLimite(prioridad);
        }
      }
      if (categoria && Object.values(CATEGORIA_TICKET).includes(categoria as any)) {
        ticket.categoria = categoria as any;
      }
      if (Array.isArray(etiquetas)) ticket.etiquetas = etiquetas;

      await ticket.save();
      return R.ok(res, { ticket });
    }

    // ── PATCH /api/tickets/:id/estado ────────────────────────────────────────
    if (id && accion === 'estado' && req.method === 'PATCH') {
      const ctx = await verificarUsuarioActivo(req, res);
      if (!ctx) return;

      const ticket = await Ticket.findById(id);
      if (!ticket) return R.noEncontrado(res, 'Ticket');

      const { estado, comentario } = req.body as { estado: EstadoTicket; comentario?: string };

      if (!Object.values(ESTADO_TICKET).includes(estado)) {
        return R.error(res, `Estado inválido. Opciones: ${Object.values(ESTADO_TICKET).join(', ')}`);
      }

      // Los usuarios solo pueden cerrar sus propios tickets resueltos
      if (ctx.role === 'user') {
        if (ticket.creadoPorUid !== ctx.uid) return R.prohibido(res);
        if (estado !== 'cerrado' || ticket.estado !== 'resuelto') {
          return R.prohibido(res, 'Solo puedes cerrar tickets en estado Resuelto');
        }
      }

      const transicionesValidas = TRANSICIONES[ticket.estado as EstadoTicket] ?? [];
      if (!transicionesValidas.includes(estado)) {
        return R.error(res, `Transición inválida: ${ticket.estado} → ${estado}`);
      }

      ticket.historial.push({
        campo: 'estado', valorAntes: ticket.estado,
        valorDespues: estado, cambiadoPor: ctx.uid, cambiadoEn: new Date(),
      });
      ticket.estado = estado;

      if (estado === 'resuelto') {
        ticket.fechaResolucion = new Date();
        const diffMs = ticket.fechaResolucion.getTime() - ticket.createdAt.getTime();
        ticket.tiempoReal = Math.round(diffMs / 60_000);
      }

      if (comentario?.trim()) {
        const { Usuario } = await import('../models/Usuario.js');
        const autor = await Usuario.findOne({ uid: ctx.uid }).select('displayName email');
        ticket.comentarios.push({
          autorUid:    ctx.uid,
          autorNombre: autor?.displayName || autor?.email || ctx.uid,
          texto:       comentario.trim(),
          esInterno:   false,
          creadoEn:    new Date(),
        });
      }

      await ticket.save();
      return R.ok(res, { ticket });
    }

    // ── PATCH /api/tickets/:id/asignar ───────────────────────────────────────
    if (id && accion === 'asignar' && req.method === 'PATCH') {
      const ctx = await adminOSoporte(req, res);
      if (!ctx) return;

      const ticket = await Ticket.findById(id);
      if (!ticket) return R.noEncontrado(res, 'Ticket');

      const { asignadoAUid } = req.body as { asignadoAUid: string };
      if (!asignadoAUid) return R.error(res, 'Se requiere asignadoAUid');

      const { Usuario } = await import('../models/Usuario.js');
      const agente = await Usuario.findOne({ uid: asignadoAUid, role: { $in: ['admin', 'support'] } });
      if (!agente) return R.error(res, 'El usuario no existe o no tiene rol de soporte', 400);

      ticket.historial.push({
        campo: 'asignadoAUid', valorAntes: ticket.asignadoAUid ?? '',
        valorDespues: asignadoAUid, cambiadoPor: ctx.uid, cambiadoEn: new Date(),
      });

      ticket.asignadoAUid    = asignadoAUid;
      ticket.asignadoANombre = agente.displayName || agente.email;
      if (ticket.estado === 'nuevo') ticket.estado = ESTADO_TICKET.Asignado;

      await ticket.save();
      return R.ok(res, { ticket });
    }

    // ── POST /api/tickets/:id/comentarios ────────────────────────────────────
    if (id && accion === 'comentarios' && req.method === 'POST') {
      if (!limitadorEscritura(req, res)) return;
      const ctx = await verificarUsuarioActivo(req, res);
      if (!ctx) return;

      const ticket = await Ticket.findById(id);
      if (!ticket) return R.noEncontrado(res, 'Ticket');

      if (ctx.role === 'user' && ticket.creadoPorUid !== ctx.uid) return R.prohibido(res);
      if (ticket.estado === 'cerrado') return R.error(res, 'No se puede comentar en un ticket cerrado');

      const { texto, esInterno } = req.body as { texto: string; esInterno?: boolean };
      if (!texto?.trim()) return R.error(res, 'El texto del comentario es requerido');

      // Solo soporte/admin pueden hacer notas internas
      const interno = ctx.role !== 'user' && !!esInterno;

      const { Usuario } = await import('../models/Usuario.js');
      const autor = await Usuario.findOne({ uid: ctx.uid }).select('displayName email');

      const comentario = {
        autorUid:    ctx.uid,
        autorNombre: autor?.displayName || autor?.email || ctx.uid,
        texto:       texto.trim(),
        esInterno:   interno,
        creadoEn:    new Date(),
      };

      ticket.comentarios.push(comentario);
      await ticket.save();

      return R.creado(res, { comentario });
    }

    // ── PATCH /api/tickets/:id/satisfaccion ─────────────────────────────────
    if (id && accion === 'satisfaccion' && req.method === 'PATCH') {
      const ctx = await verificarUsuarioActivo(req, res);
      if (!ctx) return;

      const ticket = await Ticket.findById(id);
      if (!ticket) return R.noEncontrado(res, 'Ticket');

      if (ticket.creadoPorUid !== ctx.uid) return R.prohibido(res);
      if (ticket.estado !== 'cerrado') return R.error(res, 'Solo se puede calificar tickets cerrados');
      if (ticket.satisfaccion) return R.error(res, 'Este ticket ya fue calificado');

      const { puntuacion } = req.body as { puntuacion: number };
      if (![1, 2, 3, 4, 5].includes(puntuacion)) return R.error(res, 'Puntuación debe ser 1-5');

      ticket.satisfaccion = puntuacion as 1 | 2 | 3 | 4 | 5;
      await ticket.save();

      return R.ok(res, { satisfaccion: ticket.satisfaccion });
    }

    // ── DELETE /api/tickets/:id ──────────────────────────────────────────────
    if (id && !accion && req.method === 'DELETE') {
      const ctx = await soloAdmin(req, res);
      if (!ctx) return;

      const ticket = await Ticket.findByIdAndDelete(id);
      if (!ticket) return R.noEncontrado(res, 'Ticket');

      return R.ok(res, { mensaje: `Ticket #${ticket.numero} eliminado` });
    }

    R.error(res, 'Ruta de tickets no encontrada', 404);
  } catch (err) {
    logError('ticketsHandler', err);
    R.errorServidor(res, err);
  }
}
