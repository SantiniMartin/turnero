import { Request, Response } from 'express';
import { handleError } from '../../utils/handle-error';
import { turnoService } from './turno.service';

type IdParams = { id: string };

export const turnoController = {
  async getAll(req: Request, res: Response) {
    try {
      const turnos = await turnoService.findAll(req.query, req.user!);
      res.status(200).json(turnos);
    } catch (error) {
      handleError(res, error);
    }
  },

  async getById(req: Request<IdParams>, res: Response) {
    try {
      const turno = await turnoService.findById(req.params.id, req.user!);
      res.status(200).json(turno);
    } catch (error) {
      handleError(res, error);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const turno = await turnoService.create(req.body ?? {}, req.user!);
      res.status(201).json(turno);
    } catch (error) {
      handleError(res, error);
    }
  },

  async update(req: Request<IdParams>, res: Response) {
    try {
      const turno = await turnoService.update(req.params.id, req.body ?? {}, req.user!);
      res.status(200).json(turno);
    } catch (error) {
      handleError(res, error);
    }
  },

  async remove(req: Request<IdParams>, res: Response) {
    try {
      await turnoService.delete(req.params.id);
      res.status(200).json({ message: 'Turno eliminado' });
    } catch (error) {
      handleError(res, error);
    }
  },
};
