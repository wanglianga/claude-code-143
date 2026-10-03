import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { UPLOAD_DIR } from './modules/upload/upload.controller';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));
  app.enableCors({ origin: true, credentials: true });

  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads/' });

  const config = new DocumentBuilder()
    .setTitle('城市临时用工日结平台 API')
    .setDescription('派单 / 考勤 / 保险 / 日结 / 申诉 / 风险沉淀')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, doc);

  app.getHttpAdapter().get('/api/health', (_req: any, res: any) => res.json({ status: 'ok' }));

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`API 服务已启动: http://localhost:${port}/api  (文档: /api/docs)`);
}
bootstrap();
