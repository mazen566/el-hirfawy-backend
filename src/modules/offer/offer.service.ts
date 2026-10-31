import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { Model, Types, HydratedDocument } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Offer } from '../../models/offer/offer.schema.js';
import { ServiceRequest } from '../../models/service-request/service-request.schema.js';
import { CommissionTransaction } from '../../models/commission-transaction/commission-transaction.schema.js';
import { WalletService } from '../wallet/wallet.service.js';
import { UserRole } from '../../common/enums/user.enums.js';

const log = new Logger('OfferService');

@Injectable()
export class OfferService {
  constructor(
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(ServiceRequest.name) private serviceRequestModel: Model<ServiceRequest>,
    @InjectModel(CommissionTransaction.name) private commissionTransactionModel: Model<CommissionTransaction>,
    private walletService: WalletService,
  ) {}

  async submitOffer(
    providerId: Types.ObjectId,
    serviceRequestId: Types.ObjectId,
    offeredPrice: number,
  ): Promise<{ success: true; offer: HydratedDocument<Offer> } | { success: false; error: string }> {
    const serviceRequest = await this.serviceRequestModel.findById(serviceRequestId).lean().exec();

    if (!serviceRequest) {
      return { success: false, error: 'Service request not found' };
    }

    const commissionAmount = Math.round(offeredPrice * 0.15 * 100) / 100;

    const walletValidation = await this.walletService.validateAndReserveCommission(providerId, commissionAmount);

    if (!walletValidation.success) {
      return { success: false, error: walletValidation.error };
    }

    const session = await this.offerModel.db.startSession();
    session.startTransaction();

    try {
      const offer = new this.offerModel({
        serviceRequestId,
        providerId,
        offeredPrice,
        status: 'PENDING',
      });

      await offer.save({ session });

      const commissionTx = new this.commissionTransactionModel({
        offerId: offer._id,
        providerId,
        commissionAmount,
        status: 'PENDING',
      });

      await commissionTx.save({ session });

      await session.commitTransaction();
      session.endSession();

      return { success: true, offer: offer as HydratedDocument<Offer> };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      await this.walletService.refundPendingCommission(providerId, commissionAmount);

      log.error('Error submitting offer, refunded commission', error);
      return { success: false, error: 'Failed to create offer. Please try again.' };
    }
  }

  async acceptOffer(
    offerId: Types.ObjectId,
    userId: Types.ObjectId,
    userRole: UserRole,
  ): Promise<
    | { success: true; offer: HydratedDocument<Offer>; serviceRequest: HydratedDocument<ServiceRequest> }
    | { success: false; error: string }
  > {
    const offer = await this.offerModel.findById(offerId).populate('serviceRequestId').lean().exec();

    if (!offer) {
      return { success: false, error: 'Offer not found' };
    }

    if (!offer.serviceRequestId) {
      return { success: false, error: 'Offer has no service request' };
    }

    const serviceRequestId = typeof offer.serviceRequestId === 'string'
      ? new Types.ObjectId(offer.serviceRequestId)
      : offer.serviceRequestId;

    const serviceRequest = await this.serviceRequestModel.findById(serviceRequestId).lean().exec();

    if (!serviceRequest) {
      return { success: false, error: 'Service request not found' };
    }

    if (serviceRequest.customerId.toString() !== userId.toString()) {
      return { success: false, error: 'Only the customer who created the service request can accept offers' };
    }

    const session = await this.offerModel.db.startSession();
    session.startTransaction();

    try {
      await this.offerModel.updateMany(
        { serviceRequestId, _id: { $ne: offer._id }, status: 'PENDING' },
        { $set: { status: 'REJECTED' } },
        { session },
      );

      const rejectedOffers = await this.offerModel.find({
        serviceRequestId,
        status: 'REJECTED',
      }).lean().exec();

      for (const rejOffer of rejectedOffers) {
        const commissionTx = await this.commissionTransactionModel
          .findOne({ offerId: rejOffer._id, status: 'PENDING' })
          .lean()
          .exec();

        if (commissionTx) {
          await this.walletService.refundPendingCommission(rejOffer.providerId, commissionTx.commissionAmount);

          await this.commissionTransactionModel.updateOne(
            { _id: commissionTx._id },
            { $set: { status: 'REFUNDED', refundedAt: new Date() } },
            { session },
          );
        }
      }

      const updatedOffer = await this.offerModel
        .findByIdAndUpdate(offer._id, { $set: { status: 'ACCEPTED' } }, { new: true, session })
        .lean()
        .exec();

      await this.serviceRequestModel
        .findByIdAndUpdate(
          serviceRequestId,
          {
            $set: {
              status: 'IN_PROGRESS',
              acceptedOfferId: offer._id,
            },
          },
          { session },
        )
        .lean()
        .exec();

      await session.commitTransaction();
      session.endSession();

      const updatedServiceRequest = await this.serviceRequestModel.findById(serviceRequestId).lean().exec();

      if (!updatedOffer) {
        return { success: false, error: 'Offer not found after update' };
      }

      return {
        success: true,
        offer: updatedOffer as HydratedDocument<Offer>,
        serviceRequest: updatedServiceRequest as HydratedDocument<ServiceRequest>,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      log.error('Error accepting offer', error);
      throw error;
    }
  }

  async confirmCompletion(
    serviceRequestId: Types.ObjectId,
    confirmationType: 'customer' | 'provider',
    userId: Types.ObjectId,
    userRole: UserRole,
  ): Promise<
    | {
        success: true;
        serviceRequest: HydratedDocument<ServiceRequest>;
        commissionReleased: boolean;
      }
    | { success: false; error: string }
  > {
    const serviceRequest = await this.serviceRequestModel.findById(serviceRequestId).lean().exec();

    if (!serviceRequest) {
      return { success: false, error: 'Service request not found' };
    }

    if (serviceRequest.status === 'COMPLETED') {
      return { success: false, error: 'Service request is already completed' };
    }

    if (!serviceRequest.acceptedOfferId) {
      return { success: false, error: 'No offer has been accepted for this service request' };
    }

    if (confirmationType === 'customer') {
      if (serviceRequest.customerId.toString() !== userId.toString()) {
        return { success: false, error: 'Only the customer can confirm completion for this service request' };
      }
    } else {
      if (userRole !== UserRole.PROVIDER) {
        return { success: false, error: 'Only providers can confirm completion as provider' };
      }

      const acceptedOffer = await this.offerModel.findById(serviceRequest.acceptedOfferId).lean().exec();
      if (!acceptedOffer || acceptedOffer.providerId.toString() !== userId.toString()) {
        return { success: false, error: 'Only the provider who submitted the accepted offer can confirm completion' };
      }
    }

    const update: Record<string, unknown> = {};

    if (confirmationType === 'customer') {
      update.customerConfirmed = true;
    } else {
      update.providerConfirmed = true;
    }

    const updated = await this.serviceRequestModel
      .findByIdAndUpdate(serviceRequest._id, { $set: update }, { new: true, runValidators: true })
      .lean()
      .exec();

    let commissionReleased = false;

    if (updated?.customerConfirmed && updated?.providerConfirmed && serviceRequest.acceptedOfferId) {
      const commissionTx = await this.commissionTransactionModel
        .findOne({ offerId: serviceRequest.acceptedOfferId, status: 'PENDING' })
        .lean()
        .exec();

      if (commissionTx) {
        await this.commissionTransactionModel
          .updateOne(
            { _id: commissionTx._id },
            {
              $set: {
                status: 'COMPLETED',
                completedAt: new Date(),
              },
            },
          )
          .exec();

        await this.walletService.releasePendingCommissionToCompany(
          serviceRequest.acceptedOfferId as unknown as Types.ObjectId,
          commissionTx.commissionAmount,
        );

        commissionReleased = true;
      }
    }

    return {
      success: true,
      serviceRequest: updated as HydratedDocument<ServiceRequest>,
      commissionReleased,
    };
  }

  async cancelServiceRequest(
    serviceRequestId: Types.ObjectId,
    userId: Types.ObjectId,
    userRole: UserRole,
  ): Promise<
    | { success: true; serviceRequest: HydratedDocument<ServiceRequest>; requiresAdminDecision: boolean }
    | { success: false; error: string; requiresAdminDecision: false }
  > {
    const serviceRequest = await this.serviceRequestModel.findById(serviceRequestId).lean().exec();

    if (!serviceRequest) {
      return { success: false, error: 'Service request not found', requiresAdminDecision: false };
    }

    if (serviceRequest.customerId.toString() !== userId.toString() && userRole !== UserRole.ADMIN) {
      return { success: false, error: 'Only the customer or admin can cancel this service request', requiresAdminDecision: false };
    }

    if (!serviceRequest.acceptedOfferId) {
      const result = await this._rejectAllOffersAndRefund(serviceRequestId);
      if (!result.success) {
        return { success: false, error: result.error, requiresAdminDecision: false };
      }
      return { success: true, serviceRequest: result.serviceRequest, requiresAdminDecision: false };
    }

    await this.serviceRequestModel.findByIdAndUpdate(
      serviceRequestId,
      { $set: { status: 'CANCELLED' } },
      { new: true },
    ).lean().exec();

    return {
      success: true,
      serviceRequest: serviceRequest as HydratedDocument<ServiceRequest>,
      requiresAdminDecision: true,
    };
  }

  private async _rejectAllOffersAndRefund(serviceRequestId: Types.ObjectId): Promise<
    | { success: true; serviceRequest: HydratedDocument<ServiceRequest> }
    | { success: false; error: string }
  > {
    const session = await this.offerModel.db.startSession();
    session.startTransaction();

    try {
      const pendingOffers = await this.offerModel.find({ serviceRequestId, status: 'PENDING' }).lean().exec();

      await this.offerModel
        .updateMany({ serviceRequestId, status: 'PENDING' }, { $set: { status: 'REJECTED' } }, { session })
        .exec();

      for (const offer of pendingOffers) {
        const commissionTx = await this.commissionTransactionModel
          .findOne({ offerId: offer._id, status: 'PENDING' })
          .lean()
          .exec();

        if (commissionTx) {
          await this.walletService.refundPendingCommission(offer.providerId, commissionTx.commissionAmount);

          await this.commissionTransactionModel
            .updateOne(
              { _id: commissionTx._id },
              { $set: { status: 'REFUNDED', refundedAt: new Date() } },
              { session },
            )
            .exec();
        }
      }

      await this.serviceRequestModel
        .findByIdAndUpdate(serviceRequestId, { $set: { status: 'CANCELLED' } }, { session })
        .lean()
        .exec();

      await session.commitTransaction();
      session.endSession();

      const updatedServiceRequest = await this.serviceRequestModel.findById(serviceRequestId).lean().exec();

      return {
        success: true,
        serviceRequest: updatedServiceRequest as HydratedDocument<ServiceRequest>,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      log.error('Error rejecting all offers and refunding', error);
      throw error;
    }
  }

  async adminDecideCommission(
    commissionId: Types.ObjectId,
    decision: 'REFUND' | 'RELEASE',
  ): Promise<{ success: true; action: string } | { success: false; error: string }> {
    const commissionTx = await this.commissionTransactionModel.findById(commissionId).exec();

    if (!commissionTx) {
      return { success: false, error: 'Commission transaction not found' };
    }

    if (commissionTx.status !== 'PENDING') {
      return { success: false, error: `Cannot make decision on commission with status: ${commissionTx.status}` };
    }

    if (decision === 'REFUND') {
      await this.commissionTransactionModel.findByIdAndUpdate(commissionId, { $set: { status: 'REFUNDED', refundedAt: new Date() } }).exec();

      await this.walletService.refundPendingCommission(commissionTx.providerId, commissionTx.commissionAmount);

      return { success: true, action: 'refunded' };
    } else {
      await this.commissionTransactionModel.findByIdAndUpdate(
        commissionId,
        { $set: { status: 'COMPLETED', completedAt: new Date() } },
      ).exec();

      await this.walletService.releasePendingCommissionToCompany(commissionTx.providerId, commissionTx.commissionAmount);

      return { success: true, action: 'released' };
    }
  }
}