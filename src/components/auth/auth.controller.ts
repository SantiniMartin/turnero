import { Request, Response } from 'express';
import { handleError } from '../../utils/handle-error';
import { authService } from './auth.service';

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const user = await authService.register(req.body ?? {});
      res.status(201).json(user);
    } catch (error) {
      handleError(res, error);
    }
  },

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body ?? {});
      res.status(200).json(result);
    } catch (error) {
      handleError(res, error);
    }
  },

  async me(req: Request, res: Response) {
    try {
      const user = await authService.me(req.user!.id);
      res.status(200).json(user);
    } catch (error) {
      handleError(res, error);
    }
  },
};
