import mongoose from 'mongoose';

let isConnected = false;

export async function conectarMongoDB(): Promise<void> {
  if (isConnected) {
    console.log('✅ Usando conexión existente a MongoDB');
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('Variable MONGODB_URI no configurada en Vercel');

  await mongoose.connect(mongoUri, {
    dbName: 'sistema-tickets-ti',
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000,
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority',
  });

  isConnected = true;
  console.log('✅ Conectado a MongoDB Atlas');
}
