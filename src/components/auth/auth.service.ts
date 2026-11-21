import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { HttpError } from '../../utils/http-error';
import { userRepository } from '../users/user.repository';

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterInput {
  nombre?: unknown;
  email?: unknown;
  password?: unknown;
}

interface LoginInput {
  email?: unknown;
  password?: unknown;
}

export const authService = {
  async register(input: RegisterInput) {
    const { nombre, email, password } = input;

    if (typeof nombre !== 'string' || nombre.trim().length < 2) {
      throw new HttpError(400, 'El nombre es obligatorio (mínimo 2 caracteres)');
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      throw new HttpError(400, 'El email no es válido');
    }
    if (typeof password !== 'string' || password.length < 8) {
      throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
    }
    if (password.length > 72) {
      // bcrypt ignora lo que pasa de 72 bytes
      throw new HttpError(400, 'La contraseña no puede superar los 72 caracteres');
    }

    const existente = await userRepository.findByEmail(email);
    if (existente) {
      throw new HttpError(400, 'El email ya está registrado');
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    // El rol nunca se toma del body: todo registro público es "user".
    const user = await userRepository.create({ nombre: nombre.trim(), email, password: hash, role: 'user' });
    return user.toJSON();
  },

  async login(input: LoginInput) {
    const { email, password } = input;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      throw new HttpError(400, 'Email y contraseña son obligatorios');
    }

    const user = await userRepository.findByEmailWithPassword(email);
    // Mismo mensaje para email inexistente y contraseña incorrecta: no revelamos qué falló.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new HttpError(401, 'Credenciales inválidas');
    }

    // El token solo lleva id y rol: nada sensible (ni email ni contraseña).
    const token = jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
    });

    return { token, user: user.toJSON() };
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new HttpError(404, 'Usuario no encontrado');
    }
    return user.toJSON();
  },
};
