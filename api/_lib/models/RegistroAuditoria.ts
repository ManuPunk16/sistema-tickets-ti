import mongoose, { Schema, Document } from 'mongoose';
import type { AccionAuditoria, RecursoAuditoria } from '../enums/index.js';

// ─── Interfaz del documento ────────────────────────────────────────────────────
export interface IRegistroAuditoria extends Document {
  uid:            string;
  email:          string;
  nombreUsuario:  string;
  rolActor:       string;
  accion:         AccionAuditoria;
  recurso:        RecursoAuditoria;
  recursoId:      string | null;
  detalle:        Record<string, unknown>;
  ip:             string;
  userAgent:      string;
  exito:          boolean;
  errorMensaje:   string | null;
  fechaAccion:    Date;
}

// ─── Schema ────────────────────────────────────────────────────────────────────
const RegistroAuditoriaSchema = new Schema<IRegistroAuditoria>(
  {
    // Quién realizó la acción
    uid:           { type: String, required: true, index: true },
    email:         { type: String, required: true },
    nombreUsuario: { type: String, default: '' },
    rolActor:      { type: String, required: true },
    // Qué acción realizó
    accion:        { type: String, required: true, index: true },
    recurso:       { type: String, required: true, index: true },
    recursoId:     { type: String, default: null },
    // Detalles adicionales (datos antes/después, campos modificados, etc.)
    detalle:       { type: Schema.Types.Mixed, default: {} },
    // Contexto de la petición
    ip:            { type: String, default: '' },
    userAgent:     { type: String, default: '' },
    exito:         { type: Boolean, default: true },
    errorMensaje:  { type: String, default: null },
    fechaAccion:   { type: Date, default: () => new Date(), index: true },
  },
  {
    // Solo se crean, nunca se actualizan (registro inmutable)
    timestamps: false,
    versionKey: false,
  }
);

// Índice compuesto para consultas frecuentes de admin
RegistroAuditoriaSchema.index({ fechaAccion: -1 });
RegistroAuditoriaSchema.index({ uid: 1, fechaAccion: -1 });
RegistroAuditoriaSchema.index({ accion: 1, fechaAccion: -1 });
RegistroAuditoriaSchema.index({ recurso: 1, recursoId: 1, fechaAccion: -1 });

export const RegistroAuditoria = mongoose.models['RegistroAuditoria']
  ?? mongoose.model<IRegistroAuditoria>('RegistroAuditoria', RegistroAuditoriaSchema);
