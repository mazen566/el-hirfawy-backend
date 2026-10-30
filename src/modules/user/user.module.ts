import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProviderRepository } from '../../models/provider/provider.repository.js';
import { Provider, ProviderSchema } from '../../models/provider/provider.schema.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { UserMongoModule } from '../../shared/index.js';
import { JwtService } from '@nestjs/jwt';
import { CloudinaryService } from '../../common/index.js';

@Module({
  imports: [UserMongoModule],
  controllers: [UserController],
  providers: [UserService, JwtService, CloudinaryService],
})
export class UserModule {}
