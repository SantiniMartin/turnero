import { QueryFilter, Types } from 'mongoose';
import { TurnoModel, Turno, Especialidad, Estado } from './turno.model';

export type TurnoFilter = QueryFilter<Turno>;

export interface TurnoData {
  paciente?: string;
  especialidad?: Especialidad;
  fecha?: Date;
  estado?: Estado;
  observaciones?: string;
  usuario?: Types.ObjectId | string;
}

// Capa de acceso a datos: único lugar que habla con Mongoose para turnos.
export const turnoRepository = {
  findAll(filter: TurnoFilter) {
    return TurnoModel.find(filter).sort({ fecha: 1 }).populate('usuario', 'nombre email');
  },

  findById(id: string) {
    return TurnoModel.findById(id).populate('usuario', 'nombre email');
  },

  // Busca un turno activo (no cancelado) en la misma especialidad y horario.
  findConflict(especialidad: Especialidad, fecha: Date, excludeId?: string) {
    const filter: TurnoFilter = {
      especialidad,
      fecha,
      estado: { $ne: 'cancelado' },
    };
    if (excludeId) filter._id = { $ne: excludeId };
    return TurnoModel.findOne(filter);
  },

  create(data: TurnoData) {
    return TurnoModel.create(data);
  },

  update(id: string, data: TurnoData) {
    return TurnoModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      'usuario',
      'nombre email',
    );
  },

  delete(id: string) {
    return TurnoModel.findByIdAndDelete(id);
  },
};
