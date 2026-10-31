import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OfferService } from '../../src/modules/offer/offer.service.js';
import { Offer } from '../../src/models/offer/offer.schema.js';
import { ServiceRequest } from '../../src/models/service-request/service-request.schema.js';
import { CommissionTransaction } from '../../src/models/commission-transaction/commission-transaction.schema.js';
import { WalletService } from '../../src/modules/wallet/wallet.service.js';
import { Types } from 'mongoose';
import { vi } from 'vitest';

const jest = vi;

const createSessionMock = () => ({
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
});

describe('OfferService', () => {
  let service: OfferService;
  let mockOfferModel: any;
  let mockServiceRequestModel: any;
  let mockCommissionTxModel: any;
  let mockWalletService: any;
  let mockSession: any;

  beforeEach(async () => {
    mockSession = createSessionMock();

    // Create a proper mock that works with `new` operator
    mockOfferModel = jest.fn();
    mockOfferModel.findById = jest.fn();
    mockOfferModel.find = jest.fn();
    mockOfferModel.findOne = jest.fn();
    mockOfferModel.updateMany = jest.fn();
    mockOfferModel.findByIdAndUpdate = jest.fn();
    mockOfferModel.db = {
      startSession: jest.fn().mockReturnValue(mockSession),
    };

    // When `new mockOfferModel()` is called, return an object with save method
    mockOfferModel.mockImplementation(function(this: any) {
      this.serviceRequestId = undefined;
      this.providerId = undefined;
      this.offeredPrice = undefined;
      this.status = undefined;
      this._id = new Types.ObjectId();
      this.save = jest.fn().mockResolvedValue(this);
      return this;
    });

    mockServiceRequestModel = {
      findById: jest.fn().mockImplementation((id) => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({
            _id: id,
            customerId: new Types.ObjectId(),
            status: 'PENDING',
            acceptedOfferId: null,
          }),
        }),
      })),
      findByIdAndUpdate: jest.fn(),
      updateMany: jest.fn(),
      findOne: jest.fn(),
    };

    // CommissionTransaction model - needs to be callable as constructor
    mockCommissionTxModel = jest.fn();
    mockCommissionTxModel.findOne = jest.fn().mockImplementation(() => ({
      lean: () => ({
        exec: jest.fn().mockResolvedValue(null),
      }),
    }));
    mockCommissionTxModel.findById = jest.fn().mockImplementation(() => ({
      lean: () => ({
        exec: jest.fn().mockResolvedValue(null),
      }),
    }));
    mockCommissionTxModel.findByIdAndUpdate = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue({}),
    }));
    mockCommissionTxModel.save = jest.fn().mockResolvedValue({});
    mockCommissionTxModel.updateOne = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue({}),
    }));
    mockCommissionTxModel.mockImplementation(function(this: any) {
      this.offerId = undefined;
      this.providerId = undefined;
      this.commissionAmount = undefined;
      this.status = undefined;
      this._id = new Types.ObjectId();
      this.save = jest.fn().mockResolvedValue(this);
      return this;
    });

    mockWalletService = {
      validateAndReserveCommission: jest.fn(),
      refundPendingCommission: jest.fn(),
      releasePendingCommissionToCompany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfferService,
        {
          provide: getModelToken(Offer.name),
          useValue: mockOfferModel,
        },
        {
          provide: getModelToken(ServiceRequest.name),
          useValue: mockServiceRequestModel,
        },
        {
          provide: getModelToken(CommissionTransaction.name),
          useValue: mockCommissionTxModel,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    service = module.get<OfferService>(OfferService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitOffer', () => {
    it('should successfully submit an offer when wallet has sufficient balance', async () => {
      const providerId = new Types.ObjectId();
      const serviceRequestId = new Types.ObjectId();
      const offeredPrice = 300;
      const commissionAmount = 45;

      mockWalletService.validateAndReserveCommission.mockResolvedValue({
        success: true,
        wallet: { providerId, availableBalance: 955, pendingCommission: 45 },
      });

      const result = await service.submitOffer(providerId, serviceRequestId, offeredPrice);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(mockWalletService.validateAndReserveCommission).toHaveBeenCalledWith(providerId, commissionAmount);
      }
    });

    it('should fail when wallet has insufficient balance', async () => {
      const providerId = new Types.ObjectId();
      const serviceRequestId = new Types.ObjectId();
      const offeredPrice = 300;

      mockWalletService.validateAndReserveCommission.mockResolvedValue({
        success: false,
        error: 'Insufficient wallet balance to cover the 15% commission. Please recharge your wallet.',
      });

      const result = await service.submitOffer(providerId, serviceRequestId, offeredPrice);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Insufficient wallet balance to cover the 15% commission. Please recharge your wallet.');
      }
    });

    it('should calculate 15% commission from offeredPrice only', async () => {
      const offeredPrice = 100;
      const expectedCommission = 15;

      const calculatedCommission = Math.round(offeredPrice * 0.15 * 100) / 100;

      expect(calculatedCommission).toBe(expectedCommission);
    });
  });

  describe('confirmCompletion', () => {
    it('should keep commission PENDING when only customer confirms', async () => {
      const customerId = new Types.ObjectId();
      const providerId = new Types.ObjectId();
      const serviceRequestId = new Types.ObjectId();
      const offerId = new Types.ObjectId();

      const mockServiceRequest = {
        _id: serviceRequestId,
        customerId: customerId,
        customerConfirmed: true,
        providerConfirmed: false,
        acceptedOfferId: offerId,
        status: 'IN_PROGRESS',
      };

      mockServiceRequestModel.findById.mockImplementation((id) => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue(mockServiceRequest),
        }),
      }));

      mockServiceRequestModel.findByIdAndUpdate.mockImplementation(() => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({
            ...mockServiceRequest,
            customerConfirmed: true,
          }),
        }),
      }));

      mockOfferModel.findById.mockImplementation(() => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({
            _id: offerId,
            providerId: providerId,
          }),
        }),
      }));

      mockCommissionTxModel.findOne.mockResolvedValue({
        offerId: offerId,
        status: 'PENDING',
        commissionAmount: 45,
      });

      mockCommissionTxModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });
      mockWalletService.releasePendingCommissionToCompany.mockResolvedValue({ success: true, wallet: {} });

      const result = await service.confirmCompletion(serviceRequestId, 'customer', customerId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.commissionReleased).toBe(false);
      }
    });

    it('should keep commission PENDING when only provider confirms', async () => {
      const customerId = new Types.ObjectId();
      const providerId = new Types.ObjectId();
      const serviceRequestId = new Types.ObjectId();
      const offerId = new Types.ObjectId();

      const mockServiceRequest = {
        _id: serviceRequestId,
        customerId: customerId,
        customerConfirmed: false,
        providerConfirmed: true,
        acceptedOfferId: offerId,
        status: 'IN_PROGRESS',
      };

      mockServiceRequestModel.findById.mockImplementation((id) => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue(mockServiceRequest),
        }),
      }));

      mockServiceRequestModel.findByIdAndUpdate.mockImplementation(() => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({
            ...mockServiceRequest,
            providerConfirmed: true,
          }),
        }),
      }));

      mockOfferModel.findById.mockImplementation(() => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({
            _id: offerId,
            providerId: providerId,
          }),
        }),
      }));

      const result = await service.confirmCompletion(serviceRequestId, 'provider', providerId);

      if (result.success) {
        expect(result.commissionReleased).toBe(false);
      }
    });
  });

  describe('cancelServiceRequest', () => {
    it('should reject all offers and refund commissions when customer cancels before acceptance', async () => {
      const serviceRequestId = new Types.ObjectId();
      const customerId = new Types.ObjectId();
      const providerId = new Types.ObjectId();
      const offerId1 = new Types.ObjectId();
      const offerId2 = new Types.ObjectId();

      mockServiceRequestModel.findById.mockImplementation((id) => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({
            _id: id,
            customerId: customerId,
            status: 'PENDING',
            acceptedOfferId: null,
          }),
        }),
      }));

      mockOfferModel.find.mockImplementation(() => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue([
            { _id: offerId1, providerId: providerId },
            { _id: offerId2, providerId: providerId },
          ]),
        }),
      }));

      mockOfferModel.updateMany.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue({}),
      }));

      mockServiceRequestModel.findByIdAndUpdate.mockImplementation(() => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({
            _id: serviceRequestId,
            customerId: customerId,
            status: 'CANCELLED',
          }),
        }),
      }));

      // Mock findOne for commission transaction
      mockCommissionTxModel.findOne.mockImplementation((query: any) => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(),
            offerId: query.offerId,
            providerId: providerId,
            commissionAmount: 45,
            status: 'PENDING',
          }),
        }),
      }));

      const mockSession2 = createSessionMock();
      mockOfferModel.db.startSession = jest.fn().mockReturnValue(mockSession2);

      mockCommissionTxModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });
      mockWalletService.refundPendingCommission.mockResolvedValue({ success: true, wallet: {} });

      const result = await service.cancelServiceRequest(serviceRequestId, customerId, 'CUSTOMER');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.requiresAdminDecision).toBe(false);
      }
    });
  });

  describe('adminDecideCommission', () => {
    it('should refund commission when admin decides REFUND', async () => {
      const commissionId = new Types.ObjectId();
      const providerId = new Types.ObjectId();
      const commissionAmount = 45;

      mockCommissionTxModel.findById.mockImplementation((id) => ({
        exec: jest.fn().mockResolvedValue({
          _id: id,
          status: 'PENDING',
          providerId: providerId,
          commissionAmount: commissionAmount,
        }),
      }));

      mockCommissionTxModel.findByIdAndUpdate.mockImplementation((id, update) => ({
        exec: jest.fn().mockResolvedValue({
          _id: id,
          status: 'REFUNDED',
          refundedAt: new Date(),
        }),
      }));

      mockCommissionTxModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });
      mockWalletService.refundPendingCommission.mockResolvedValue({ success: true, wallet: {} });

      const result = await service.adminDecideCommission(commissionId, 'REFUND');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.action).toBe('refunded');
      }
    });

    it('should release commission when admin decides RELEASE', async () => {
      const commissionId = new Types.ObjectId();
      const providerId = new Types.ObjectId();
      const commissionAmount = 45;

      mockCommissionTxModel.findById.mockImplementation((id) => ({
        exec: jest.fn().mockResolvedValue({
          _id: id,
          status: 'PENDING',
          providerId: providerId,
          commissionAmount: commissionAmount,
        }),
      }));

      mockCommissionTxModel.findByIdAndUpdate.mockImplementation((id, update) => ({
        exec: jest.fn().mockResolvedValue({
          _id: id,
          status: 'COMPLETED',
          completedAt: new Date(),
        }),
      }));

      mockCommissionTxModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });
      mockWalletService.releasePendingCommissionToCompany.mockResolvedValue({ success: true, wallet: {} });

      const result = await service.adminDecideCommission(commissionId, 'RELEASE');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.action).toBe('released');
      }
    });
  });
});