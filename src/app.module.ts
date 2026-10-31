import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserMongoModule } from './shared/index.js';
import { UserModule } from './modules/user/user.module.js';
import { ProviderModule } from './modules/provider/provider.module.js';
import { WalletModule } from './modules/wallet/wallet.module.js';
import { OfferModule } from './modules/offer/offer.module.js';

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
    UserModule,
    ProviderModule,
    WalletModule,
    OfferModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
