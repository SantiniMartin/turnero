import { NextFunction, Request, Response } from 'express';

// Extra: muestra en consola el método, la URL, el status y la duración de cada petición.
export function logger(req: Request, res: Response, next: NextFunction): void {
  const inicio = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - inicio;
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
}
