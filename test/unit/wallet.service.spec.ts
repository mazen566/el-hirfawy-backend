import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { WalletService } from '../../src/modules/wallet/wallet.service.js';
import { Wallet } from '../../src/models/wallet/wallet.schema.js';
import { Types } from 'mongoose';
import { vi } from 'vitest';

const jest = vi;

describe('WalletService', () => {
  let service: WalletService;
  let mockWalletModel: {
    findOneAndUpdate: jest.Mock;
    findOne: jest.Mock;
    db: {
      startSession: jest.Mock;
    };
  };

  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  const createChainableMock = <T>(returnValue: T) => {
    const chain = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(returnValue),
    };
    return chain;
  };

  beforeEach(async () => {
    mockWalletModel = {
      findOneAndUpdate: jest.fn().mockReturnValue(createChainableMock(null)),
      findOne: jest.fn().mockReturnValue(createChainableMock(null)),
      db: {
        startSession: jest.fn().mockReturnValue(mockSession),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getModelToken(Wallet.name),
          useValue: mockWalletModel,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndReserveCommission', () => {
    it('should succeed when wallet has sufficient balance', async () => {
      const providerId = new Types.ObjectId();
      const commissionAmount = 45;

      const mockWallet = {
        providerId,
        availableBalance: 955,
        pendingCommission: 45,
      };

      mockWalletModel.findOneAndUpdate.mockReturnValue(createChainableMock(mockWallet));

      const result = await service.validateAndReserveCommission(providerId, commissionAmount);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.wallet.availableBalance).toBe(955);
        expect(result.wallet.pendingCommission).toBe(45);
      }
      expect(mockWalletModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId,
          availableBalance: { $gte: commissionAmount },
        }),
        expect.objectContaining({
          $inc: {
            availableBalance: -commissionAmount,
            pendingCommission: commissionAmount,
          },
        }),
        expect.objectContaining({ session: mockSession }),
      );
    });

    it('should fail when wallet has insufficient balance', async () => {
      const providerId = new Types.ObjectId();
      const commissionAmount = 45;

      mockWalletModel.findOneAndUpdate.mockReturnValue(createChainableMock(null));

      const result = await service.validateAndReserveCommission(providerId, commissionAmount);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Insufficient wallet balance to cover the 15% commission. Please recharge your wallet.');
      }

      expect(mockWalletModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId,
          availableBalance: { $gte: commissionAmount },
        }),
        expect.objectContaining({
          $inc: {
            availableBalance: -commissionAmount,
            pendingCommission: commissionAmount,
          },
        }),
        expect.objectContaining({ session: mockSession }),
      );
    });

    it('should fail when commission amount is zero or negative', async () => {
      const providerId = new Types.ObjectId();
      const commissionAmount = 0;

      const result = await service.validateAndReserveCommission(providerId, commissionAmount);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid commission amount');
      }
      expect(mockWalletModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('refundPendingCommission', () => {
    it('should successfully refund pending commission to available balance', async () => {
      const providerId = new Types.ObjectId();
      const commissionAmount = 45;

      const mockWallet = {
        providerId,
        availableBalance: 1000,
        pendingCommission: 0,
      };

      mockWalletModel.findOneAndUpdate.mockReturnValue(createChainableMock(mockWallet));

      const result = await service.refundPendingCommission(providerId, commissionAmount);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.wallet.pendingCommission).toBe(0);
      }
      expect(mockWalletModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId,
          pendingCommission: { $gte: commissionAmount },
        }),
        expect.objectContaining({
          $inc: {
            pendingCommission: -commissionAmount,
            availableBalance: commissionAmount,
          },
        }),
        expect.objectContaining({ session: mockSession }),
      );
    });

    it('should fail if insufficient pending commission', async () => {
      const providerId = new Types.ObjectId();
      const commissionAmount = 45;

      mockWalletModel.findOneAndUpdate.mockReturnValue(createChainableMock(null));

      const result = await service.refundPendingCommission(providerId, commissionAmount);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Insufficient pending commission for refund');
      }
    });
  });

  describe('releasePendingCommissionToCompany', () => {
    it('should decrease pending commission without adding to available balance', async () => {
      const providerId = new Types.ObjectId();
      const commissionAmount = 45;

      const mockWallet = {
        providerId,
        availableBalance: 955,
        pendingCommission: 0,
      };

      mockWalletModel.findOneAndUpdate.mockReturnValue(createChainableMock(mockWallet));

      const result = await service.releasePendingCommissionToCompany(providerId, commissionAmount);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.wallet.availableBalance).toBe(955);
        expect(result.wallet.pendingCommission).toBe(0);
      }
      expect(mockWalletModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId,
          pendingCommission: { $gte: commissionAmount },
        }),
        expect.objectContaining({
          $inc: {
            pendingCommission: -commissionAmount,
          },
        }),
        expect.objectContaining({ session: mockSession }),
      );
    });
  });
});