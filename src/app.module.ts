import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserMongoModule } from './shared/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI as string, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      onConnectionCreate: (connection: Connection) => {
        connection.on('connected', () => {
          console.log('Connected to MongoDB successfully');
        });
        connection.on('error', (error) => {
          console.error('MongoDB connection error:', error.message);
        });
        return connection;
      },
    }),
    UserMongoModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
