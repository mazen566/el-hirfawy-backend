import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, HydratedDocument } from 'mongoose';
import { Wallet } from '../../models/wallet/wallet.schema.js';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
  ) {}

  /**
   * Validates wallet balance and reserves the commission atomically.
   * Deducts from availableBalance, adds to pendingCommission.
   * Note: For true multi-document atomicity, MongoDB replica set is required.
   */
  async validateAndReserveCommission(
    providerId: Types.ObjectId,
    commissionAmount: number,
  ): Promise<{ success: true; wallet: HydratedDocument<Wallet> } | { success: false; error: string }> {
    if (commissionAmount <= 0) {
      return { success: false, error: 'Invalid commission amount' };
    }

    const session = await this.walletModel.db.startSession();
    session.startTransaction();

    try {
      const wallet = await this.walletModel
        .findOneAndUpdate(
          { providerId, availableBalance: { $gte: commissionAmount } },
          { $inc: { availableBalance: -commissionAmount, pendingCommission: commissionAmount } },
          { new: true, session },
        )
        .lean<HydratedDocument<Wallet>>()
        .exec();

      if (!wallet) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          error: 'Insufficient wallet balance to cover the 15% commission. Please recharge your wallet.',
        };
      }

      await session.commitTransaction();
      session.endSession();
      return { success: true, wallet };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Refunds a pending commission back to available balance.
   * Used when an offer is rejected or cancelled by admin decision.
   * Decreases pendingCommission, increases availableBalance.
   */
  async refundPendingCommission(
    providerId: Types.ObjectId,
    commissionAmount: number,
  ): Promise<{ success: true; wallet: HydratedDocument<Wallet> } | { success: false; error: string }> {
    if (commissionAmount <= 0) {
      return { success: false, error: 'Invalid commission amount' };
    }

    const session = await this.walletModel.db.startSession();
    session.startTransaction();

    try {
      const wallet = await this.walletModel.findOneAndUpdate(
        { providerId, pendingCommission: { $gte: commissionAmount } },
        {
          $inc: { pendingCommission: -commissionAmount, availableBalance: commissionAmount },
        },
        { new: true, session },
      )
        .lean<HydratedDocument<Wallet>>()
        .exec();

      if (!wallet) {
        await session.abortTransaction();
        session.endSession();
        return { success: false, error: 'Insufficient pending commission for refund' };
      }

      await session.commitTransaction();
      session.endSession();
      return { success: true, wallet };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Releases commission (decreases pendingCommission, does NOT add to availableBalance).
   * Used when admin decides to RELEASE the commission to company.
   */
  async releasePendingCommissionToCompany(
    providerId: Types.ObjectId,
    commissionAmount: number,
  ): Promise<{ success: true; wallet: HydratedDocument<Wallet> } | { success: false; error: string }> {
    if (commissionAmount <= 0) {
      return { success: false, error: 'Invalid commission amount' };
    }

    const session = await this.walletModel.db.startSession();
    session.startTransaction();

    try {
      const wallet = await this.walletModel.findOneAndUpdate(
        { providerId, pendingCommission: { $gte: commissionAmount } },
        { $inc: { pendingCommission: -commissionAmount } },
        { new: true, session },
      )
        .lean<HydratedDocument<Wallet>>()
        .exec();

      if (!wallet) {
        await session.abortTransaction();
        session.endSession();
        return { success: false, error: 'Insufficient pending commission for release' };
      }

      await session.commitTransaction();
      session.endSession();
      return { success: true, wallet };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Creates a new wallet for a provider if it doesn't exist.
   */
  async createWalletIfNotExists(providerId: Types.ObjectId): Promise<Wallet> {
    const existingWallet = await this.walletModel.findOne({ providerId }).exec();

    if (existingWallet) {
      return existingWallet;
    }

    const wallet = new this.walletModel({
      providerId,
      availableBalance: 0,
      pendingCommission: 0,
    });

    return wallet.save();
  }
}