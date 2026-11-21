import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role, ROLES } from '../components/users/user.model';

export interface TokenPayload {
  id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Verifica el JWT enviado como "Authorization: Bearer <token>".
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token no provisto' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    if (
      typeof decoded !== 'object' ||
      typeof decoded.id !== 'string' ||
      !ROLES.includes(decoded.role)
    ) {
      res.status(401).json({ message: 'Token inválido' });
      return;
    }
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
}
