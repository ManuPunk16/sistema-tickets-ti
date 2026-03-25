import admin from 'firebase-admin';
import { VercelRequest, VercelResponse } from '@vercel/node';

// ✅ Guard booleano — mismo patrón que kash-flow-pos
let firebaseInicializado = false;

function inicializarFirebase() {
  if (firebaseInicializado) return;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      throw new Error(
        `Variables de Firebase faltantes: ${!projectId ? 'FIREBASE_PROJECT_ID ' : ''}${!privateKey ? 'FIREBASE_PRIVATE_KEY ' : ''}${!clientEmail ? 'FIREBASE_CLIENT_EMAIL' : ''}`
      );
    }

    // ✅ Doble verificación para evitar "App already initialized"
    if (!admin.apps || admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
      });
    }

    firebaseInicializado = true;
    console.log('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error);
    throw error;
  }
}

export const firebaseAdmin = admin;

export async function verificarToken(
  req: VercelRequest,
  res: VercelResponse
): Promise<admin.auth.DecodedIdToken | null> {
  // ✅ Inicializar DENTRO de la función, no al cargar el módulo
  inicializarFirebase();

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
