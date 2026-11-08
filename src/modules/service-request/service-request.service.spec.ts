import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../common/index.js';
import {
    ServiceRequest,
    ServiceRequestRepository,
    ServiceRequestStatus,
} from '../../models/index.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { ServiceRequestService } from './service-request.service.js';

describe('ServiceRequestService', () => {
  let service: ServiceRequestService;

  const CUSTOMER_ID = '6aea6eb4160bf14f2c57de50';
  const OTHER_CUSTOMER_ID = '6aea6eb4160bf14f2c57de51';
  const REQUEST_ID = '6af0b0d48a7264b67ecdd2dc';
  const CATEGORY_ID = '6aea6eb4160bf14f2c57de52';

  const validDto = (): CreateServiceRequestDto => ({
    category: CATEGORY_ID,
    title: 'Living Room Painting',
    description: 'I need to paint my living room',
    aiEstimatedMinPiastres: 50000,
    aiEstimatedMaxPiastres: 80000,
    customerOfferPiastres: 65000,
    location: {
      type: 'Point',
      coordinates: [31.2, 30.05],
    },
  });

  const createMockRequest = (
    overrides: Record<string, any> = {},
  ): ServiceRequest =>
    ({
      _id: new Types.ObjectId(REQUEST_ID),
      customer: new Types.ObjectId(CUSTOMER_ID),
      category: new Types.ObjectId(CATEGORY_ID),
      title: 'Living Room Painting',
      description: 'I need to paint my living room',
      aiEstimatedMinPiastres: 50000,
      aiEstimatedMaxPiastres: 80000,
      customerOfferPiastres: 65000,
      location: {
        type: 'Point',
        coordinates: [31.2, 30.05],
      },
      status: ServiceRequestStatus.PENDING,
      ...overrides,
    }) as unknown as ServiceRequest;

  const mockRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByCustomer: vi.fn(),
    findByCustomerAndStatus: vi.fn(),
    findByStatus: vi.fn(),
    findActive: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new ServiceRequestService(
      mockRepository as unknown as ServiceRequestRepository,
    );
  });

  // CREATE
  describe('create', () => {
    it('should create a service request successfully', async () => {
      const dto = validDto();
      const createdRequest = createMockRequest();

      mockRepository.create.mockResolvedValue(createdRequest);

      const result = await service.create(dto, CUSTOMER_ID);

      expect(result).toEqual(createdRequest);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...dto,
        customer: new Types.ObjectId(CUSTOMER_ID),
        category: new Types.ObjectId(CATEGORY_ID),
        location: {
          type: 'Point',
          coordinates: [31.2, 30.05],
        },
        status: ServiceRequestStatus.PENDING,
      });
    });

    it('should reject an invalid customer ID', async () => {
      await expect(service.create(validDto(), 'invalid-id')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject non-integer prices', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        customerOfferPiastres: 65000.5,
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject zero or negative prices', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        aiEstimatedMinPiastres: 0,
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject when minimum price is greater than maximum price', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        aiEstimatedMinPiastres: 90000,
        aiEstimatedMaxPiastres: 80000,
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject when minimum price equals maximum price', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        aiEstimatedMinPiastres: 80000,
        aiEstimatedMaxPiastres: 80000,
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject customer offer below AI minimum price', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        customerOfferPiastres: 40000,
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject customer offer above AI maximum price', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        customerOfferPiastres: 90000,
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should accept customer offer equal to AI minimum price', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        customerOfferPiastres: 50000,
      };

      mockRepository.create.mockResolvedValue(createMockRequest());

      await expect(service.create(dto, CUSTOMER_ID)).resolves.toBeDefined();
    });

    it('should accept customer offer equal to AI maximum price', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        customerOfferPiastres: 80000,
      };

      mockRepository.create.mockResolvedValue(createMockRequest());

      await expect(service.create(dto, CUSTOMER_ID)).resolves.toBeDefined();
    });

    it('should reject location with an invalid type', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        location: {
          type: 'Polygon',
          coordinates: [31.2, 30.05],
        },
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject location with less than two coordinates', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        location: {
          type: 'Point',
          coordinates: [31.2],
        },
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject location with more than two coordinates', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        location: {
          type: 'Point',
          coordinates: [31.2, 30.05, 100],
        },
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject non-finite coordinates', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        location: {
          type: 'Point',
          coordinates: [Number.NaN, 30.05],
        },
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject longitude outside valid range', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        location: {
          type: 'Point',
          coordinates: [181, 30.05],
        },
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject latitude outside valid range', async () => {
      const dto: CreateServiceRequestDto = {
        ...validDto(),
        location: {
          type: 'Point',
          coordinates: [31.2, 91],
        },
      };

      await expect(service.create(dto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  // FIND BY ID
  describe('findById', () => {
    it('should return request to its owner customer', async () => {
      const request = createMockRequest();

      mockRepository.findById.mockResolvedValue(request);

      const result = await service.findById(
        REQUEST_ID,
        CUSTOMER_ID,
        UserRole.CUSTOMER,
      );

      expect(result).toEqual(request);
    });

    it('should reject access when another customer requests it', async () => {
      mockRepository.findById.mockResolvedValue(createMockRequest());

      await expect(
        service.findById(REQUEST_ID, OTHER_CUSTOMER_ID, UserRole.CUSTOMER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to access any request', async () => {
      const request = createMockRequest();

      mockRepository.findById.mockResolvedValue(request);

      const result = await service.findById(
        REQUEST_ID,
        OTHER_CUSTOMER_ID,
        UserRole.ADMIN,
      );

      expect(result).toEqual(request);
    });

    it('should allow provider to access pending request', async () => {
      const request = createMockRequest({
        status: ServiceRequestStatus.PENDING,
      });

      mockRepository.findById.mockResolvedValue(request);

      const result = await service.findById(
        REQUEST_ID,
        OTHER_CUSTOMER_ID,
        UserRole.PROVIDER,
      );

      expect(result).toEqual(request);
    });

    it('should reject provider access to non-pending request', async () => {
      const request = createMockRequest({
        status: ServiceRequestStatus.BOOKED,
      });

      mockRepository.findById.mockResolvedValue(request);

      await expect(
        service.findById(REQUEST_ID, OTHER_CUSTOMER_ID, UserRole.PROVIDER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject access for unsupported role', async () => {
      mockRepository.findById.mockResolvedValue(createMockRequest());

      await expect(
        service.findById(REQUEST_ID, OTHER_CUSTOMER_ID, 'Unknown' as UserRole),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject invalid request ID', async () => {
      await expect(
        service.findById('invalid-id', CUSTOMER_ID, UserRole.CUSTOMER),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when request does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.findById(REQUEST_ID, CUSTOMER_ID, UserRole.CUSTOMER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // FIND BY CUSTOMER
  describe('findByCustomer', () => {
    it('should return customer requests', async () => {
      const requests = [createMockRequest()];

      mockRepository.findByCustomer.mockResolvedValue(requests);

      const result = await service.findByCustomer(CUSTOMER_ID);

      expect(result).toEqual(requests);
      expect(mockRepository.findByCustomer).toHaveBeenCalledWith(CUSTOMER_ID);
    });

    it('should reject invalid customer ID', async () => {
      await expect(service.findByCustomer('invalid-id')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.findByCustomer).not.toHaveBeenCalled();
    });
  });

  // FIND BY CUSTOMER AND STATUS
  describe('findByCustomerAndStatus', () => {
    it('should return customer requests with the requested status', async () => {
      const requests = [
        createMockRequest({
          status: ServiceRequestStatus.PENDING,
        }),
      ];

      mockRepository.findByCustomerAndStatus.mockResolvedValue(requests);

      const result = await service.findByCustomerAndStatus(
        CUSTOMER_ID,
        ServiceRequestStatus.PENDING,
      );

      expect(result).toEqual(requests);
      expect(mockRepository.findByCustomerAndStatus).toHaveBeenCalledWith(
        CUSTOMER_ID,
        ServiceRequestStatus.PENDING,
      );
    });

    it('should reject invalid customer ID', async () => {
      await expect(
        service.findByCustomerAndStatus(
          'invalid-id',
          ServiceRequestStatus.PENDING,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.findByCustomerAndStatus).not.toHaveBeenCalled();
    });
  });

  // FIND BY STATUS
  describe('findByStatus', () => {
    it('should return requests with the requested status', async () => {
      const requests = [createMockRequest()];

      mockRepository.findByStatus.mockResolvedValue(requests);

      const result = await service.findByStatus(ServiceRequestStatus.PENDING);

      expect(result).toEqual(requests);
      expect(mockRepository.findByStatus).toHaveBeenCalledWith(
        ServiceRequestStatus.PENDING,
      );
    });
  });

  // FIND ACTIVE
  describe('findActive', () => {
    it('should return active service requests', async () => {
      const requests = [createMockRequest()];

      mockRepository.findActive.mockResolvedValue(requests);

      const result = await service.findActive();

      expect(result).toEqual(requests);
      expect(mockRepository.findActive).toHaveBeenCalledTimes(1);
    });
  });
});
