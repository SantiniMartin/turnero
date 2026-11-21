import { NextFunction, Request, Response } from 'express';
import { Role } from '../components/users/user.model';

// Extra: restringe una ruta a ciertos roles. Debe usarse después de authenticate.
export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'No tenés permisos para realizar esta acción' });
      return;
    }
    next();
  };
}
