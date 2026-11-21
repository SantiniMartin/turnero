import dns from 'node:dns';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { UserModel } from '../components/users/user.model';

// Crea (o promueve) el usuario administrador definido en el .env.
// Uso: pnpm seed:admin
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  const nombre = process.env.ADMIN_NOMBRE || 'Administrador';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Definí ADMIN_EMAIL y ADMIN_PASSWORD en el .env');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres');
  }

  await mongoose.connect(env.mongoUri);

  const hash = await bcrypt.hash(password, 10);
  const existente = await UserModel.findOne({ email: email.toLowerCase() });

  if (existente) {
    existente.role = 'admin';
    existente.password = hash;
    await existente.save();
    console.log(`Usuario ${email} actualizado como admin`);
  } else {
    await UserModel.create({ nombre, email, password: hash, role: 'admin' });
    console.log(`Admin ${email} creado`);
  }
}

main()
  .catch((error) => {
    console.error('No se pudo crear el admin:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
