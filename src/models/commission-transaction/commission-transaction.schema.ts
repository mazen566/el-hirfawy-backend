import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import type { Offer } from '../offer/offer.schema.js';

export type CommissionTransactionDocument = CommissionTransaction & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
  },
})
export class CommissionTransaction {
  @Prop({
    type: Types.ObjectId,
    ref: 'Offer',
    required: true,
    unique: true,
  })
  offerId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Provider',
    required: true,
  })
  providerId: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  commissionAmount: number;

  @Prop({
    type: String,
    enum: ['PENDING', 'COMPLETED', 'REFUNDED'],
    default: 'PENDING',
  })
  status: 'PENDING' | 'COMPLETED' | 'REFUNDED';

  @Prop({
    type: Date,
    default: null,
  })
  completedAt?: Date;

  @Prop({
    type: Date,
    default: null,
  })
  refundedAt?: Date;
}

export const CommissionTransactionSchema = SchemaFactory.createForClass(CommissionTransaction);