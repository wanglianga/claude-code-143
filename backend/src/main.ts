import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { config } from './config';
import { runSeed } from './seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));

  if (process.env.SEED_ON_START !== 'false') {
    try {
      await runSeed();
    } catch (e) {
      console.error('[seed] 种子执行失败（忽略并继续启动）:', (e as Error).message);
    }
  }

  await app.listen(config.port, '0.0.0.0');
  console.log(`[backend] 城市临时用工平台已启动: http://0.0.0.0:${config.port}`);
}

bootstrap();
