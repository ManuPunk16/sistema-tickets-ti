import { VercelRequest, VercelResponse } from '@vercel/node';
import authHandler from '../../_lib/handlers/auth.js';
import usuariosHandler from '../../_lib/handlers/usuarios.js';

const ORIGENES_PERMITIDOS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'https://tickets-ti-cj.vercel.app',
];

export default async (req: VercelRequest, res: VercelResponse) => {
  const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);
  const origin = req.headers.origin || '';

  res.setHeader(
    'Access-Control-Allow-Origin',
    ORIGENES_PERMITIDOS.includes(origin) ? origin : ORIGENES_PERMITIDOS[2]
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Accept, Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    if (pathname === '/api' || pathname === '/api/') {
      res.status(200).json({ ok: true, mensaje: '✅ Sistema Tickets TI API v1.0' });
      return;
    }
    if (pathname.startsWith('/api/auth'))     return await authHandler(req, res);
    if (pathname.startsWith('/api/usuarios')) return await usuariosHandler(req, res);

    res.status(404).json({ error: 'Ruta no encontrada', pathname });
  } catch (error) {
    console.error('Error en API:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
