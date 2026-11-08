import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ServiceRequest,
  ServiceRequestStatus,
} from './service-request.schema.js';

@Injectable()
export class ServiceRequestRepository {
  constructor(
    @InjectModel(ServiceRequest.name)
    private readonly serviceRequestModel: Model<ServiceRequest>,
  ) {}

  async create(data: Partial<ServiceRequest>): Promise<ServiceRequest> {
    const created = new this.serviceRequestModel(data);
    return created.save();
  }

  async findById(id: string): Promise<ServiceRequest | null> {
    return this.serviceRequestModel.findById(id).lean();
  }

  async findByCustomer(customerId: string): Promise<ServiceRequest[]> {
    return this.serviceRequestModel
      .find({ customer: new Types.ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByStatus(status: ServiceRequestStatus): Promise<ServiceRequest[]> {
    return this.serviceRequestModel
      .find({ status })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByCustomerAndStatus(
    customerId: string,
    status: ServiceRequestStatus,
  ): Promise<ServiceRequest[]> {
    return this.serviceRequestModel
      .find({
        customer: new Types.ObjectId(customerId),
        status,
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findActive(): Promise<ServiceRequest[]> {
    return this.serviceRequestModel
      .find({ status: ServiceRequestStatus.PENDING })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findOneAndUpdate(
    filter: object,
    update: object,
    options?: { new?: boolean },
  ): Promise<ServiceRequest | null> {
    return this.serviceRequestModel
      .findOneAndUpdate(filter, update, {
        ...options,
        runValidators: true,
      })
      .lean();
  }

  async deleteOne(id: string): Promise<boolean> {
    const result = await this.serviceRequestModel.deleteOne({
      _id: id,
    });

    return result.deletedCount > 0;
  }
}
