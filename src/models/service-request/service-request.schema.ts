import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ServiceRequestDocument = ServiceRequest & Document;

export enum ServiceRequestStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  BOOKED = 'booked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ServiceRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  customer: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  category: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  title: string;

  @Prop({
    type: String,
    required: true,
  })
  description: string;

  @Prop({
    type: [String],
    default: [],
  })
  images: string[];

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  aiEstimatedMinPiastres: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  aiEstimatedMaxPiastres: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  customerOfferPiastres: number;

  @Prop({
    type: Date,
  })
  preferredDate?: Date;

  @Prop({
    type: String,
  })
  preferredTime?: string;

  @Prop({
    type: String,
    enum: ServiceRequestStatus,
    default: ServiceRequestStatus.DRAFT,
  })
  status: ServiceRequestStatus;
}

export const ServiceRequestSchema =
  SchemaFactory.createForClass(ServiceRequest);

ServiceRequestSchema.index({ customer: 1 });
ServiceRequestSchema.index({ category: 1 });
ServiceRequestSchema.index({ status: 1 });
ServiceRequestSchema.index({ createdAt: -1 });

ServiceRequestSchema.index({ location: '2dsphere' });
