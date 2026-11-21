import { Response } from 'express';
import mongoose from 'mongoose';
import { HttpError } from './http-error';

// Traduce cualquier error a una respuesta HTTP. Se usa en el catch de cada controlador.
export function handleError(res: Response, error: unknown): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const errores = Object.values(error.errors).map((e) => e.message);
    res.status(400).json({ message: 'Datos inválidos', errores });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: `Valor inválido para el campo ${error.path}` });
    return;
  }

  console.error(error);
  res.status(500).json({ message: 'Error interno del servidor' });
}
