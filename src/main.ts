// import { ValidationPipe } from '@nestjs/common';
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module.js';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//     }),
//   );
//   await app.listen(process.env.PORT ?? 3000, () => {
//     console.log(`Server is running on port ${process.env.PORT ?? 3000}`);
//   });
// }
// await bootstrap();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

console.log('[BOOT] main.ts loaded');

async function bootstrap() {
  try {
    console.log('[BOOT] Starting NestFactory.create');

    const app = await NestFactory.create(AppModule);

    console.log('[BOOT] NestFactory.create completed');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const port = process.env.PORT ?? 3000;

    console.log('[BOOT] Starting app.listen');

    await app.listen(port);

    console.log('[BOOT] App is listening');
  } catch (error) {
    console.error('[BOOT ERROR]', error);
    throw error;
  }
}

await bootstrap();
