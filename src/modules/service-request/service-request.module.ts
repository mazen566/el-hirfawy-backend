import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ServiceRequest,
  ServiceRequestRepository,
  ServiceRequestSchema,
} from '../../models/index.js';
import { UserMongoModule } from '../../shared/index.js';
import { ServiceRequestController } from './service-request.controller.js';
import { ServiceRequestService } from './service-request.service.js';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    UserMongoModule,
    MongooseModule.forFeature([
      {
        name: ServiceRequest.name,
        schema: ServiceRequestSchema,
      },
    ]),
  ],
  controllers: [ServiceRequestController],
  providers: [ServiceRequestService, ServiceRequestRepository, JwtService],
  exports: [ServiceRequestService],
})
export class ServiceRequestModule {}
