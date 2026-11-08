import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRole } from '../../common/index.js';
import {
  ServiceRequest,
  ServiceRequestRepository,
  ServiceRequestStatus,
} from '../../models/index.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';

@Injectable()
export class ServiceRequestService {
  constructor(
    private readonly serviceRequestRepository: ServiceRequestRepository,
  ) {}

  private validateId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid service request ID');
    }
  }

  private validatePrices(
    minPrice: number,
    maxPrice: number,
    customerOffer: number,
  ): void {
    if (
      !Number.isInteger(minPrice) ||
      !Number.isInteger(maxPrice) ||
      !Number.isInteger(customerOffer)
    ) {
      throw new BadRequestException('Prices must be integers in piastres');
    }

    if (minPrice <= 0 || maxPrice <= 0 || customerOffer <= 0) {
      throw new BadRequestException('Prices must be greater than zero');
    }

    if (minPrice >= maxPrice) {
      throw new BadRequestException(
        'AI minimum price must be less than maximum price',
      );
    }

    if (customerOffer < minPrice || customerOffer > maxPrice) {
      throw new BadRequestException(
        'Customer offer must be within the AI estimated price range',
      );
    }
  }

  private validateLocation(
    location: CreateServiceRequestDto['location'],
  ): void {
    if (
      !location ||
      location.type !== 'Point' ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      throw new BadRequestException('Invalid GeoJSON location');
    }

    const [longitude, latitude] = location.coordinates;

    if (
      typeof longitude !== 'number' ||
      typeof latitude !== 'number' ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude)
    ) {
      throw new BadRequestException(
        'Location coordinates must be valid numbers',
      );
    }

    if (
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new BadRequestException(
        'Location coordinates are out of valid range',
      );
    }
  }

  async create(
    createDto: CreateServiceRequestDto,
    customerId: string,
  ): Promise<ServiceRequest> {
    this.validateId(customerId);
    this.validatePrices(
      createDto.aiEstimatedMinPiastres,
      createDto.aiEstimatedMaxPiastres,
      createDto.customerOfferPiastres,
    );
    this.validateLocation(createDto.location);

    return this.serviceRequestRepository.create({
      ...createDto,
      customer: new Types.ObjectId(customerId),
      category: new Types.ObjectId(createDto.category),
      location: {
        type: 'Point',
        coordinates: [
          createDto.location.coordinates[0],
          createDto.location.coordinates[1],
        ],
      },
      status: ServiceRequestStatus.PENDING,
    });
  }

  async findById(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<ServiceRequest> {
    this.validateId(id);
    const serviceRequest = await this.serviceRequestRepository.findById(id);

    if (!serviceRequest) {
      throw new NotFoundException('Service request not found');
    }

    if (userRole === UserRole.ADMIN) {
      return serviceRequest;
    }

    if (userRole === UserRole.CUSTOMER) {
      if (serviceRequest.customer.toString() !== userId.toString()) {
        throw new ForbiddenException('Access denied');
      }
      return serviceRequest;
    }

    if (userRole === UserRole.PROVIDER) {
      if (serviceRequest.status !== ServiceRequestStatus.PENDING) {
        throw new ForbiddenException('Access denied');
      }
      return serviceRequest;
    }

    throw new ForbiddenException('Access denied');
  }

  async findByCustomer(customerId: string): Promise<ServiceRequest[]> {
    this.validateId(customerId);

    return this.serviceRequestRepository.findByCustomer(customerId);
  }

  async findByCustomerAndStatus(
    customerId: string,
    status: ServiceRequestStatus,
  ): Promise<ServiceRequest[]> {
    this.validateId(customerId);

    return this.serviceRequestRepository.findByCustomerAndStatus(
      customerId,
      status,
    );
  }

  async findByStatus(status: ServiceRequestStatus): Promise<ServiceRequest[]> {
    return this.serviceRequestRepository.findByStatus(status);
  }

  async findActive(): Promise<ServiceRequest[]> {
    return this.serviceRequestRepository.findActive();
  }
}
