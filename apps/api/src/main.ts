import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  app.use(helmet());
  app.enableCors({
    origin: env.NEXTAUTH_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api', { exclude: ['health'] });

  await app.listen(env.PORT, '0.0.0.0');
  Logger.log(`API listening on http://localhost:${env.PORT}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  Logger.error('Failed to bootstrap', err, 'Bootstrap');
  process.exit(1);
});
