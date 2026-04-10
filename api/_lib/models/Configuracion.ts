import mongoose, { Document, Schema } from 'mongoose';

// ─── Interfaz del documento de Configuración ─────────────────────────────────
export interface IConfiguracion extends Document {
  // Identificador único del documento (singleton)
  clave: 'sistema';

  // Información general
  nombreSistema:  string;
  emailSoporte:   string;
  modoMantenimiento: boolean;

  // Notificaciones
  notificacionesEmail: boolean;
  notifNuevoTicket:    boolean;
  notifCambioEstado:   boolean;
  notifComentario:     boolean;
  recordatorioActivo:  boolean;
  diasRecordatorio:    number;

  // SLA en horas
  slaBaja:    number;
  slaMedia:   number;
  slaAlta:    number;
  slaCritica: number;

  updatedAt: Date;
  updatedBy?: string;
}

const configuracionSchema = new Schema<IConfiguracion>(
  {
    clave:               { type: String, default: 'sistema', unique: true },
    nombreSistema:       { type: String, default: 'Sistema de Tickets TI' },
    emailSoporte:        { type: String, default: '' },
    modoMantenimiento:   { type: Boolean, default: false },
    notificacionesEmail: { type: Boolean, default: true },
    notifNuevoTicket:    { type: Boolean, default: true },
    notifCambioEstado:   { type: Boolean, default: true },
    notifComentario:     { type: Boolean, default: true },
    recordatorioActivo:  { type: Boolean, default: false },
    diasRecordatorio:    { type: Number, default: 7 },
    slaBaja:             { type: Number, default: 72 },
    slaMedia:            { type: Number, default: 24 },
    slaAlta:             { type: Number, default: 8 },
    slaCritica:          { type: Number, default: 2 },
    updatedBy:           { type: String },
  },
  { timestamps: { createdAt: false, updatedAt: 'updatedAt' } }
);

// Valores por defecto al hacer findOneAndUpdate con upsert
export const CONFIG_DEFAULTS: Omit<IConfiguracion, keyof Document | 'clave'> = {
  nombreSistema:       'Sistema de Tickets TI',
  emailSoporte:        '',
  modoMantenimiento:   false,
  notificacionesEmail: true,
  notifNuevoTicket:    true,
  notifCambioEstado:   true,
  notifComentario:     true,
  recordatorioActivo:  false,
  diasRecordatorio:    7,
  slaBaja:             72,
  slaMedia:            24,
  slaAlta:             8,
  slaCritica:          2,
  updatedAt:           new Date(),
};

export const Configuracion = mongoose.models['Configuracion'] as mongoose.Model<IConfiguracion>
  ?? mongoose.model<IConfiguracion>('Configuracion', configuracionSchema);
