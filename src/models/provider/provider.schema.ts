import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  ProviderAvailability,
  VerificationStatus,
} from '../../common/index.js';
import { User } from '../user/user.schema.js';

@Schema()
export class Provider extends User {
  // Professional Information

  @Prop({ type: String, trim: true })
  title: string | null;

  @Prop({ type: String, trim: true })
  bio: string | null;

  @Prop({ type: Number, min: 0 })
  experience: number | null;

  // Verification

  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @Prop({ type: String, default: null })
  idCardImageKey: string | null;

  @Prop({ type: String, default: null })
  selfieImageKey: string | null;

  @Prop({ type: Number, default: null, min: 0, max: 100 })
  aiResult: number | null;

  @Prop({
    type: Date,
  })
  verifiedAt?: Date;

  @Prop({
    type: String,
  })
  verifiedBy?: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 1000,
  })
  rejectionReason?: string;

  // Rating

  @Prop({
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  })
  ratingAvg: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  ratingCount: number;

  // Completed Services

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  totalCompletedServices: number;

  // Availability

  @Prop({
    type: String,
    enum: ProviderAvailability,
    default: ProviderAvailability.OFFLINE,
  })
  availabilityStatus: ProviderAvailability;

  // Working Hours

  @Prop({
    type: [
      {
        dayOfWeek: {
          type: Number,
          required: true,
          min: 0,
          max: 6,
        },

        from: {
          type: String,
          required: true,
        },

        to: {
          type: String,
          required: true,
        },
      },
    ],
    default: [],
  })
  workingHours: {
    dayOfWeek: number;
    from: string;
    to: string;
  }[];

  // Service Areas

  @Prop({
    type: [String],
    default: [],
  })
  serviceAreas: string[];
}

export const ProviderSchema = SchemaFactory.createForClass(Provider);
