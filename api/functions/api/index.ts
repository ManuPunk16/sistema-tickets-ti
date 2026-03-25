import { VercelRequest, VercelResponse } from '@vercel/node';

export default async (req: VercelRequest, res: VercelResponse) => {
  const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);

  const origin = req.headers.origin || '';
  const origenesPermitidos = [
    'http://localhost:4200',
    'https://tickets-ti-cj.vercel.app',
  ];

  res.setHeader(
    'Access-Control-Allow-Origin',
    origenesPermitidos.includes(origin) ? origin : origenesPermitidos[1]
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With, Accept, Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Health check
    if (pathname === '/api' || pathname === '/api/') {
      res.status(200).json({
        ok: true,
        mensaje: '✅ Sistema Tickets TI API funcionando',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(404).json({ error: 'Ruta no encontrada', pathname });
  } catch (error) {
    console.error('Error en API:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
