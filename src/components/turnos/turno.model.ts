import { Schema, model, InferSchemaType, HydratedDocument, Types } from 'mongoose';

export const ESPECIALIDADES = [
  'clinica',
  'cardiologia',
  'dermatologia',
  'pediatria',
  'traumatologia',
  'ginecologia',
  'oftalmologia',
] as const;
export type Especialidad = (typeof ESPECIALIDADES)[number];

export const ESTADOS = ['pendiente', 'confirmado', 'cancelado', 'atendido'] as const;
export type Estado = (typeof ESTADOS)[number];

const turnoSchema = new Schema(
  {
    paciente: { type: String, required: true, trim: true, maxlength: 100 },
    especialidad: { type: String, enum: ESPECIALIDADES, required: true },
    fecha: { type: Date, required: true },
    estado: { type: String, enum: ESTADOS, default: 'pendiente' },
    observaciones: { type: String, trim: true, maxlength: 500 },
    // Relación: cada turno pertenece al usuario que lo creó.
    usuario: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

turnoSchema.index({ especialidad: 1, fecha: 1 });
turnoSchema.index({ usuario: 1, fecha: 1 });

export type Turno = InferSchemaType<typeof turnoSchema> & { usuario: Types.ObjectId };
export type TurnoDocument = HydratedDocument<Turno>;

export const TurnoModel = model('Turno', turnoSchema);
