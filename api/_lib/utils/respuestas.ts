import { VercelResponse } from '@vercel/node';

export function ok(res: VercelResponse, datos: object, codigo = 200): void {
  res.status(codigo).json({ ok: true, ...datos });
}

export function creado(res: VercelResponse, datos: object): void {
  ok(res, datos, 201);
}

export function sinContenido(res: VercelResponse): void {
  res.status(204).end();
}

export function error(res: VercelResponse, mensaje: string, codigo = 400): void {
  res.status(codigo).json({ ok: false, error: mensaje });
}

export function noEncontrado(res: VercelResponse, recurso = 'Recurso'): void {
  error(res, `${recurso} no encontrado`, 404);
}

export function noAutorizado(res: VercelResponse): void {
  error(res, 'Token de autorización no proporcionado o inválido', 401);
}

export function prohibido(res: VercelResponse, motivo?: string): void {
  error(res, motivo ?? 'No tienes permisos para realizar esta acción', 403);
}

export function errorServidor(res: VercelResponse, err: unknown): void {
  console.error('[API Error]', err);
  const mensaje =
    process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err instanceof Error ? err.message : String(err);
  error(res, mensaje, 500);
}

export function paginado<T>(
  res: VercelResponse,
  datos: T[],
  total: number,
  pagina: number,
  limite: number
): void {
  res.status(200).json({
    ok:     true,
    datos,
    total,
    pagina,
    limite,
    paginas: Math.ceil(total / limite),
  });
}
