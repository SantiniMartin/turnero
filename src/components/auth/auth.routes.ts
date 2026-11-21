import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middlewares/auth.middleware';
import { authController } from './auth.controller';

// Limita intentos de login/registro para frenar fuerza bruta.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos, probá de nuevo en unos minutos' },
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, authController.register);
authRouter.post('/login', authLimiter, authController.login);
authRouter.get('/me', authenticate, authController.me);
