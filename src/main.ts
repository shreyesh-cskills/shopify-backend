import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // Health check at the root URL (outside the /api prefix): GET /
  app.getHttpAdapter().get('/', (_req: any, res: any) => {
    res.send('Server is running');
  });
  // CORS_ORIGIN may list several origins, comma-separated
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim());
  app.enableCors({ origin: origins });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/api`);
}
bootstrap();
