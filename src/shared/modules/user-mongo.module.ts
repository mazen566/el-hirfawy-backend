import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Admin,
  AdminRepository,
  AdminSchema,
  Customer,
  CustomerRepository,
  CustomerSchema,
  Provider,
  ProviderRepository,
  ProviderSchema,
  User,
  UserRepository,
  UserSchema,
} from '../../models/index.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
        discriminators: [
          { name: Admin.name, schema: AdminSchema },
          { name: Provider.name, schema: ProviderSchema },
          { name: Customer.name, schema: CustomerSchema },
        ],
      },
    ]),
  ],
  controllers: [],
  providers: [
    UserRepository,
    AdminRepository,
    ProviderRepository,
    CustomerRepository,
  ],
  exports: [
    UserRepository,
    AdminRepository,
    ProviderRepository,
    CustomerRepository,
  ],
})
export class UserMongoModule {}
