import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUsuario extends Document {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'support' | 'user' | 'pending' | 'inactive';
  department?: string;
  position?: string;
  authProvider: 'email' | 'google';
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UsuarioSchema = new Schema<IUsuario>(
  {
    uid:          { type: String, required: true, unique: true, index: true },
    email:        { type: String, required: true, unique: true },
    displayName:  { type: String, default: '' },
    photoURL:     { type: String, default: null },
    role: {
      type: String,
      enum: ['admin', 'support', 'user', 'pending', 'inactive'],
      default: 'pending',
    },
    department:   { type: String },
    position:     { type: String },
    authProvider: { type: String, enum: ['email', 'google'], required: true },
    lastLogin:    { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Evitar redefinición del modelo en hot-reload de Vercel
export const Usuario: Model<IUsuario> =
  mongoose.models['Usuario'] ??
  mongoose.model<IUsuario>('Usuario', UsuarioSchema);