import dns from 'node:dns';
import mongoose from 'mongoose';
import { app } from './app';
import { env } from './config/env';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function main() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log('Conectado a MongoDB');

  app.listen(env.port, () => {
    console.log(`API escuchando en http://localhost:${env.port}`);
  });
}

main().catch((error) => {
  console.error('No se pudo iniciar la API:', error);
  process.exit(1);
});