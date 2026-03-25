import mongoose from 'mongoose';

// Patrón singleton para Vercel serverless (evita reconexiones en cada invocación)
let conexionCached: mongoose.Connection | null = null;

export async function conectarMongoDB(): Promise<void> {
  if (conexionCached && conexionCached.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Variable MONGODB_URI no configurada en Vercel');

  const conn = await mongoose.connect(uri, {
    dbName: 'sistema-tickets-ti',
    bufferCommands: false,
  });

  conexionCached = conn.connection;
}