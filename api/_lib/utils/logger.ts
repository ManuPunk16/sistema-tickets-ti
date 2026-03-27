import { createLogger, format, transports } from 'winston';
import { VercelRequest } from '@vercel/node';

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} [${level}] ${message}${extra}`;
        })
      ),
    }),
  ],
});

export default logger;

/** Registra cada petición entrante con método, ruta y uid si existe */
export function logRequest(req: VercelRequest, uid?: string): void {
  const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);
  logger.info('Request', {
    metodo: req.method,
    ruta:   pathname,
    uid:    uid ?? 'anonimo',
    ip:     (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? 'desconocida',
  });
}

export function logError(mensaje: string, error: unknown): void {
  logger.error(mensaje, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
