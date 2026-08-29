import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = config.get<string>('apiPrefix') ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string[]>('corsOrigins') ?? [],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (config.get<string>('nodeEnv') !== 'production') {
    const docConfig = new DocumentBuilder()
      .setTitle('Sunseekers Travel Platform API')
      .setDescription('Central backend for the Sunseekers travel management platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  app.enableShutdownHooks();

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger UI on http://localhost:${port}/${apiPrefix}/docs`);
}

void bootstrap();
