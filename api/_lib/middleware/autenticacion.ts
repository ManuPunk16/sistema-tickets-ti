import * as admin from 'firebase-admin';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Singleton — evita "Firebase App already initialized"
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new Error('Variables de Firebase Admin SDK no configuradas en Vercel');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export const firebaseAdmin = admin;

export async function verificarToken(
  req: VercelRequest,
  res: VercelResponse
): Promise<admin.auth.DecodedIdToken | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autorización no proporcionado' });
    return null;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    return await admin.auth().verifyIdToken(token);
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
    return null;
  }
}
