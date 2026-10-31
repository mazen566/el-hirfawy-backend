import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ServiceRequestDocument = ServiceRequest & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
  },
})
export class ServiceRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  customerId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
  })
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @Prop({
    type: Number,
    required: true,
    min: 0.01,
  })
  servicePrice: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'Offer',
  })
  acceptedOfferId: Types.ObjectId;

  @Prop({
    type: Boolean,
    default: false,
  })
  customerConfirmed: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  providerConfirmed: boolean;
}

export const ServiceRequestSchema = SchemaFactory.createForClass(ServiceRequest);