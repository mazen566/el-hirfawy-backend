import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OfferService } from './offer.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import { Offer, OfferSchema } from '../../models/offer/offer.schema.js';
import { ServiceRequest, ServiceRequestSchema } from '../../models/service-request/service-request.schema.js';
import { CommissionTransaction, CommissionTransactionSchema } from '../../models/commission-transaction/commission-transaction.schema.js';
import { OfferController, AdminCommissionController } from './offer.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: ServiceRequest.name, schema: ServiceRequestSchema },
      { name: CommissionTransaction.name, schema: CommissionTransactionSchema },
    ]),
  ],
  controllers: [OfferController, AdminCommissionController],
  providers: [OfferService],
  exports: [OfferService],
})
export class OfferModule {}