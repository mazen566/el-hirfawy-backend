import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type OfferDocument = Offer & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
  },
})
export class Offer {
  @Prop({
    type: Types.ObjectId,
    ref: 'ServiceRequest',
    required: true,
  })
  serviceRequestId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Provider',
    required: true,
  })
  providerId: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 0.01,
  })
  offeredPrice: number;

  @Prop({
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    default: 'PENDING',
  })
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';

  @Prop({
    type: Boolean,
    default: false,
  })
  providerConfirmed: boolean;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);