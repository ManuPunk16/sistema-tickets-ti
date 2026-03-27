import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  EstadoTicket,
  Prioridad,
  CategoriaTicket,
  ESTADO_TICKET,
  PRIORIDAD,
  CATEGORIA_TICKET,
} from '../enums/index.js';

// ─── Sub-documento: Comentario ────────────────────────────────────────────────
export interface IComentario {
  autorUid:    string;
  autorNombre: string;
  texto:       string;
  esInterno:   boolean;  // Nota interna visible solo para soporte/admin
  creadoEn:    Date;
}

const ComentarioSchema = new Schema<IComentario>(
  {
    autorUid:    { type: String, required: true },
    autorNombre: { type: String, required: true },
    texto:       { type: String, required: true, maxlength: 5000 },
    esInterno:   { type: Boolean, default: false },
    creadoEn:    { type: Date, default: Date.now },
  },
  { _id: true }
);

// ─── Sub-documento: Archivo adjunto ──────────────────────────────────────────
export interface IArchivo {
  nombre:     string;
  url:        string;  // URL de Firebase Storage
  tipo:       string;  // MIME type
  tamanio:    number;  // bytes
  creadoEn:   Date;
}

const ArchivoSchema = new Schema<IArchivo>(
  {
    nombre:   { type: String, required: true },
    url:      { type: String, required: true },
    tipo:     { type: String, required: true },
    tamanio:  { type: Number, required: true },
    creadoEn: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ─── Sub-documento: Entrada de historial ─────────────────────────────────────
export interface IHistorialEntrada {
  campo:      string;
  valorAntes: string;
  valorDespues: string;
  cambiadoPor: string;  // uid
  cambiadoEn:  Date;
}

const HistorialSchema = new Schema<IHistorialEntrada>(
  {
    campo:        { type: String, required: true },
    valorAntes:   { type: String },
    valorDespues: { type: String },
    cambiadoPor:  { type: String, required: true },
    cambiadoEn:   { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Documento principal: Ticket ──────────────────────────────────────────────
export interface ITicket extends Document {
  numero:        number;           // Autoincremental legible: TKT-001
  titulo:        string;
  descripcion:   string;
  estado:        EstadoTicket;
  prioridad:     Prioridad;
  categoria:     CategoriaTicket;
  departamento:  string;           // Nombre del departamento
  creadoPorUid:  string;
  creadoPorNombre: string;
  asignadoAUid?: string;
  asignadoANombre?: string;
  comentarios:   IComentario[];
  archivos:      IArchivo[];
  historial:     IHistorialEntrada[];
  fechaLimite?:  Date;             // Calculado por SLA al crear
  fechaResolucion?: Date;
  tiempoReal?:   number;           // Minutos hasta resolución
  satisfaccion?: 1 | 2 | 3 | 4 | 5;
  etiquetas:     string[];
  createdAt:     Date;
  updatedAt:     Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    numero: { type: Number, unique: true },
    titulo: {
      type: String, required: true, trim: true, maxlength: 200,
    },
    descripcion: { type: String, required: true, maxlength: 5000 },
    estado: {
      type: String,
      enum: Object.values(ESTADO_TICKET),
      default: ESTADO_TICKET.Nuevo,
    },
    prioridad: {
      type: String,
      enum: Object.values(PRIORIDAD),
      default: PRIORIDAD.Media,
    },
    categoria: {
      type: String,
      enum: Object.values(CATEGORIA_TICKET),
      required: true,
    },
    departamento:     { type: String, required: true },
    creadoPorUid:     { type: String, required: true, index: true },
    creadoPorNombre:  { type: String, required: true },
    asignadoAUid:     { type: String, index: true },
    asignadoANombre:  { type: String },
    comentarios:      { type: [ComentarioSchema], default: [] },
    archivos:         { type: [ArchivoSchema], default: [] },
    historial:        { type: [HistorialSchema], default: [] },
    fechaLimite:      { type: Date },
    fechaResolucion:  { type: Date },
    tiempoReal:       { type: Number },
    satisfaccion:     { type: Number, enum: [1, 2, 3, 4, 5] },
    etiquetas:        { type: [String], default: [] },
  },
  { timestamps: true }
);

// Autoincremental seguro para el número de ticket
TicketSchema.pre('save', async function () {
  if (this.isNew) {
    const ultimo = await (this.constructor as any).findOne(
      {}, {}, { sort: { numero: -1 } }
    );
    this.numero = (ultimo?.numero ?? 0) + 1;
  }
});

// Índices compuestos para queries frecuentes
TicketSchema.index({ estado: 1, createdAt: -1 });
TicketSchema.index({ departamento: 1, estado: 1 });
TicketSchema.index({ prioridad: 1, estado: 1 });
TicketSchema.index({ creadoPorUid: 1, createdAt: -1 });
TicketSchema.index({ asignadoAUid: 1, estado: 1 });

export const Ticket: Model<ITicket> =
  mongoose.models['Ticket'] ??
  mongoose.model<ITicket>('Ticket', TicketSchema);
