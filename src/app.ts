import express from 'express';
import helmet from 'helmet';
import { logger } from './middlewares/logger.middleware';
import { notFound } from './middlewares/not-found.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { authRouter } from './components/auth/auth.routes';
import { turnoRouter } from './components/turnos/turno.routes';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(logger);
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/turnos', turnoRouter);

app.use(notFound);
app.use(errorHandler);
