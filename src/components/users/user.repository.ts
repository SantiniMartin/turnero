import { UserModel, Role } from './user.model';

// Capa de acceso a datos: único lugar que habla con Mongoose para usuarios.
export const userRepository = {
  findByEmail(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() });
  },

  findByEmailWithPassword(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() }).select('+password');
  },

  findById(id: string) {
    return UserModel.findById(id);
  },

  create(data: { nombre: string; email: string; password: string; role?: Role }) {
    return UserModel.create(data);
  },
};
