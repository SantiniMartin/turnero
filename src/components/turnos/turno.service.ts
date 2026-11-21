import { HttpError } from '../../utils/http-error';
import { assertObjectId } from '../../utils/validate-object-id';
import { TokenPayload } from '../../middlewares/auth.middleware';
import { ESPECIALIDADES, ESTADOS, Especialidad, Estado, TurnoDocument } from './turno.model';
import { turnoRepository, TurnoData, TurnoFilter } from './turno.repository';

const DURACION_TURNO_MIN = 30;
const HORA_APERTURA = 8;
const HORA_CIERRE = 20;
const TIMEZONE = 'America/Argentina/Buenos_Aires';

// ---------- helpers de validación ----------

function parseFecha(valor: unknown): Date {
  if (typeof valor !== 'string' && !(valor instanceof Date)) {
    throw new HttpError(400, 'La fecha es obligatoria (formato ISO 8601, ej: 2026-12-01T10:30:00-03:00)');
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    throw new HttpError(400, 'La fecha no tiene un formato válido');
  }
  return fecha;
}

function horaLocal(fecha: Date): { dia: number; hora: number; minuto: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const get = (type: string) => partes.find((p) => p.type === type)!.value;
  const dias = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return { dia: dias.indexOf(get('weekday')), hora: Number(get('hour')), minuto: Number(get('minute')) };
}

// Regla de negocio 1: el turno tiene que ser a futuro.
// Regla de negocio 2: dentro del horario de atención (lun a vie, 8 a 20 h, bloques de 30 min).
function validarFecha(fecha: Date): void {
  if (fecha.getTime() <= Date.now()) {
    throw new HttpError(400, 'No se puede asignar un turno en una fecha pasada');
  }
  const { dia, hora, minuto } = horaLocal(fecha);
  if (dia === 0 || dia === 6) {
    throw new HttpError(400, 'Solo se atiende de lunes a viernes');
  }
  if (hora < HORA_APERTURA || hora >= HORA_CIERRE) {
    throw new HttpError(400, `El horario de atención es de ${HORA_APERTURA} a ${HORA_CIERRE} h`);
  }
  if (minuto % DURACION_TURNO_MIN !== 0 || fecha.getUTCSeconds() !== 0 || fecha.getUTCMilliseconds() !== 0) {
    throw new HttpError(400, `Los turnos son cada ${DURACION_TURNO_MIN} minutos (ej: 10:00 o 10:30)`);
  }
}

function validarEspecialidad(valor: unknown): Especialidad {
  if (typeof valor !== 'string' || !ESPECIALIDADES.includes(valor as Especialidad)) {
    throw new HttpError(400, `La especialidad debe ser una de: ${ESPECIALIDADES.join(', ')}`);
  }
  return valor as Especialidad;
}

function validarEstado(valor: unknown): Estado {
  if (typeof valor !== 'string' || !ESTADOS.includes(valor as Estado)) {
    throw new HttpError(400, `El estado debe ser uno de: ${ESTADOS.join(', ')}`);
  }
  return valor as Estado;
}

function validarPaciente(valor: unknown): string {
  if (typeof valor !== 'string' || valor.trim().length < 2 || valor.trim().length > 100) {
    throw new HttpError(400, 'El paciente es obligatorio (entre 2 y 100 caracteres)');
  }
  return valor.trim();
}

function validarObservaciones(valor: unknown): string | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor !== 'string' || valor.length > 500) {
    throw new HttpError(400, 'Las observaciones deben ser texto de hasta 500 caracteres');
  }
  return valor.trim();
}

// Regla de negocio 3: no puede haber dos turnos activos en la misma especialidad y horario.
async function validarDisponibilidad(especialidad: Especialidad, fecha: Date, excludeId?: string): Promise<void> {
  const conflicto = await turnoRepository.findConflict(especialidad, fecha, excludeId);
  if (conflicto) {
    throw new HttpError(400, 'Ya existe un turno de esa especialidad en ese horario');
  }
}

function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function esDueno(turno: TurnoDocument, user: TokenPayload): boolean {
  const usuario = turno.usuario as unknown as { _id?: { toString(): string } } | { toString(): string };
  const id = '_id' in usuario && usuario._id ? usuario._id.toString() : usuario.toString();
  return id === user.id;
}

// ---------- servicio ----------

export const turnoService = {
  async findAll(query: Record<string, unknown>, user: TokenPayload) {
    const filter: TurnoFilter = {};

    // Relación: un usuario común solo ve sus turnos; el admin ve todos.
    if (user.role !== 'admin') {
      filter.usuario = user.id;
    }

    // Filtros con req.query
    if (query.especialidad !== undefined) filter.especialidad = validarEspecialidad(query.especialidad);
    if (query.estado !== undefined) filter.estado = validarEstado(query.estado);
    if (query.paciente !== undefined) {
      if (typeof query.paciente !== 'string') throw new HttpError(400, 'El filtro paciente debe ser texto');
      filter.paciente = { $regex: escapeRegex(query.paciente), $options: 'i' };
    }
    if (query.desde !== undefined || query.hasta !== undefined) {
      const rango: { $gte?: Date; $lte?: Date } = {};
      if (query.desde !== undefined) rango.$gte = parseFecha(query.desde);
      if (query.hasta !== undefined) rango.$lte = parseFecha(query.hasta);
      if (rango.$gte && rango.$lte && rango.$gte > rango.$lte) {
        throw new HttpError(400, '"desde" no puede ser posterior a "hasta"');
      }
      filter.fecha = rango;
    }

    return turnoRepository.findAll(filter);
  },

  async findById(id: string, user: TokenPayload) {
    assertObjectId(id);
    const turno = await turnoRepository.findById(id);
    // Si el turno es de otro usuario respondemos 404 para no revelar que existe.
    if (!turno || (user.role !== 'admin' && !esDueno(turno, user))) {
      throw new HttpError(404, 'Turno no encontrado');
    }
    return turno;
  },

  async create(body: Record<string, unknown>, user: TokenPayload) {
    const paciente = validarPaciente(body.paciente);
    const especialidad = validarEspecialidad(body.especialidad);
    const fecha = parseFecha(body.fecha);
    const observaciones = validarObservaciones(body.observaciones);

    if (body.estado !== undefined && body.estado !== 'pendiente') {
      throw new HttpError(400, 'Un turno nuevo solo puede crearse en estado "pendiente"');
    }

    validarFecha(fecha);
    await validarDisponibilidad(especialidad, fecha);

    const turno = await turnoRepository.create({
      paciente,
      especialidad,
      fecha,
      observaciones,
      estado: 'pendiente',
      usuario: user.id,
    });
    return turnoRepository.findById(turno.id);
  },

  async update(id: string, body: Record<string, unknown>, user: TokenPayload) {
    const actual = await this.findById(id, user);

    // Regla de negocio 4: un turno cancelado o atendido ya no se puede modificar.
    if (actual.estado === 'cancelado' || actual.estado === 'atendido') {
      throw new HttpError(400, `No se puede modificar un turno ${actual.estado}`);
    }

    const cambios: TurnoData = {};
    if (body.paciente !== undefined) cambios.paciente = validarPaciente(body.paciente);
    if (body.especialidad !== undefined) cambios.especialidad = validarEspecialidad(body.especialidad);
    if (body.fecha !== undefined) cambios.fecha = parseFecha(body.fecha);
    if (body.observaciones !== undefined) cambios.observaciones = validarObservaciones(body.observaciones);
    if (body.estado !== undefined) {
      cambios.estado = validarEstado(body.estado);
      // Solo el admin (la clínica) puede marcar un turno como confirmado o atendido.
      if ((cambios.estado === 'confirmado' || cambios.estado === 'atendido') && user.role !== 'admin') {
        throw new HttpError(403, 'Solo un administrador puede confirmar o marcar como atendido un turno');
      }
    }

    if (Object.keys(cambios).length === 0) {
      throw new HttpError(
        400,
        'Enviá al menos un campo para actualizar: paciente, especialidad, fecha, estado u observaciones',
      );
    }

    // Si cambia la fecha o la especialidad, revalidamos horario y disponibilidad.
    if (cambios.fecha !== undefined || cambios.especialidad !== undefined) {
      const fecha = cambios.fecha ?? actual.fecha;
      const especialidad = cambios.especialidad ?? actual.especialidad;
      if (cambios.fecha !== undefined) validarFecha(fecha);
      if (cambios.estado !== 'cancelado') await validarDisponibilidad(especialidad, fecha, id);
    }

    const actualizado = await turnoRepository.update(id, cambios);
    if (!actualizado) throw new HttpError(404, 'Turno no encontrado');
    return actualizado;
  },

  async delete(id: string) {
    assertObjectId(id);
    const eliminado = await turnoRepository.delete(id);
    if (!eliminado) {
      throw new HttpError(404, 'Turno no encontrado');
    }
    return eliminado;
  },
};
