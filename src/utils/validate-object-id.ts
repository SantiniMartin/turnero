import { isValidObjectId } from 'mongoose';
import { HttpError } from './http-error';

export function assertObjectId(id: string): void {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, 'El id no tiene un formato válido');
  }
}
