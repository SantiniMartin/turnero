import { NextFunction, Request, Response } from 'express';

// Red de seguridad para errores que ocurren fuera de los controladores
// (por ejemplo, un body con JSON mal formado que rechaza express.json()).
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'El body no es un JSON válido' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ message: 'El body es demasiado grande' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor' });
}
