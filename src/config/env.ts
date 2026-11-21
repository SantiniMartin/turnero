import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Falta la variable de entorno ${name}. Revisá tu archivo .env`);
  }
  return value;
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: required('MONGO_URI'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
};