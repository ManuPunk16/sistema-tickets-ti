import { VercelRequest } from '@vercel/node';
import { RegistroAuditoria } from '../models/RegistroAuditoria.js';
import type { AccionAuditoria, RecursoAuditoria } from '../enums/index.js';
import { logError } from './logger.js';

// ─── Tipos de entrada ──────────────────────────────────────────────────────────
export interface DatosAuditoria {
  uid:           string;
  email:         string;
  nombreUsuario: string;
  rolActor:      string;
  accion:        AccionAuditoria;
  recurso:       RecursoAuditoria;
  recursoId?:    string | null;
  detalle?:      Record<string, unknown>;
  exito?:        boolean;
  errorMensaje?: string | null;
  req:           VercelRequest;
}

// ─── Extraer IP del request ────────────────────────────────────────────────────
function extraerIp(req: VercelRequest): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    return ips.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] as string || 'desconocida';
}

// ─── Función principal de registro ────────────────────────────────────────────
// No lanza errores — la auditoría no debe bloquear el flujo normal de la API
export async function registrarAuditoria(datos: DatosAuditoria): Promise<void> {
  try {
    await RegistroAuditoria.create({
      uid:           datos.uid,
      email:         datos.email,
      nombreUsuario: datos.nombreUsuario,
      rolActor:      datos.rolActor,
      accion:        datos.accion,
      recurso:       datos.recurso,
      recursoId:     datos.recursoId ?? null,
      detalle:       datos.detalle ?? {},
      ip:            extraerIp(datos.req),
      userAgent:     String(datos.req.headers['user-agent'] ?? '').substring(0, 300),
      exito:         datos.exito ?? true,
      errorMensaje:  datos.errorMensaje ?? null,
      fechaAccion:   new Date(),
    });
  } catch (err) {
    // Registrar el error en logs pero NO propagar — la auditoría es secundaria
    logError('registrarAuditoria', err instanceof Error ? err : new Error(String(err)));
  }
}
