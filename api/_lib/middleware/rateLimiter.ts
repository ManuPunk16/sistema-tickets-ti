import { VercelRequest, VercelResponse } from '@vercel/node';

interface VentanaIP {
  solicitudes: number;
  resetEn:     number;
}

// Store en memoria — válido para el proceso Vercel actual
const ventanas = new Map<string, VentanaIP>();

function obtenerIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0];
  return (forwarded?.split(',')[0] ?? req.socket?.remoteAddress ?? 'desconocida').trim();
}

/**
 * Rate limiter in-memory por IP.
 * @param maxSolicitudes numero máximo de peticiones en la ventana
 * @param ventanaMs      duración de la ventana en milisegundos
 */
export function rateLimiter(maxSolicitudes: number, ventanaMs: number) {
  return function limitador(
    req: VercelRequest,
    res: VercelResponse
  ): boolean {
    const ip   = obtenerIP(req);
    const ahora = Date.now();

    const ventana = ventanas.get(ip);

    if (!ventana || ahora > ventana.resetEn) {
      ventanas.set(ip, { solicitudes: 1, resetEn: ahora + ventanaMs });
      return true;
    }

    if (ventana.solicitudes >= maxSolicitudes) {
      const segundos = Math.ceil((ventana.resetEn - ahora) / 1000);
      res.status(429).json({
        error: `Demasiadas solicitudes. Espera ${segundos} segundos.`,
      });
      return false;
    }

    ventana.solicitudes++;
    return true;
  };
}

// Límites predefinidos reutilizables
export const limitadorGeneral   = rateLimiter(100, 60_000);  // 100 req/min
export const limitadorAuth      = rateLimiter(10,  60_000);  // 10 req/min (login)
export const limitadorEscritura = rateLimiter(30,  60_000);  // 30 req/min (POST/PUT)
