import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { turnoController } from './turno.controller';

export const turnoRouter = Router();

// Todas las rutas de turnos requieren JWT: cada usuario ve y gestiona solo los suyos.
turnoRouter.use(authenticate);

turnoRouter.get('/', turnoController.getAll);
turnoRouter.get('/:id', turnoController.getById);
turnoRouter.post('/', turnoController.create);
turnoRouter.put('/:id', turnoController.update);
// Extra roles: solo un admin puede eliminar.
turnoRouter.delete('/:id', authorize('admin'), turnoController.remove);
