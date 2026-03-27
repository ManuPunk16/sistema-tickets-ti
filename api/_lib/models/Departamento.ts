import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDepartamento extends Document {
  nombre:      string;
  descripcion?: string;
  responsableUid?: string;
  activo:      boolean;
  createdAt:   Date;
  updatedAt:   Date;
}

const DepartamentoSchema = new Schema<IDepartamento>(
  {
    nombre:          { type: String, required: true, unique: true, trim: true },
    descripcion:     { type: String, trim: true },
    responsableUid:  { type: String },
    activo:          { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Departamento: Model<IDepartamento> =
  mongoose.models['Departamento'] ??
  mongoose.model<IDepartamento>('Departamento', DepartamentoSchema);
