import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  AccountStatus,
  AuthProvider,
  UserRole,
} from '../../common/enums/user.enums.js';
import { Schema as MongooseSchema } from 'mongoose';

@Schema({
  timestamps: true,
  discriminatorKey: 'role',
  toJSON: {
    virtuals: true,
  },
})
export class User {
  readonly _id: Types.ObjectId;

  // Basic Information

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  firstName: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  lastName: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
  })
  phone: string;

  // Authentication

  @Prop({
    type: String,
    required: true,
  })
  password: string;

  /**
   * IMPORTANT:
   * Do NOT add @Prop() to role.
   * role is the discriminatorKey.
   */
  role: UserRole;

  @Prop({
    type: String,
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Prop({ type: String, unique: true, sparse: true })
  googleId?: string;

  @Prop({ type: String, unique: true, sparse: true })
  facebookId?: string;

  // Account Status

  @Prop({
    type: String,
    enum: AccountStatus,
    default: AccountStatus.PENDING,
  })
  status: AccountStatus;

  @Prop({
    type: Boolean,
    default: false,
  })
  phoneVerified: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  emailVerified: boolean;

  // Profile

  @Prop({
    type: String,
    default: null,
  })
  profileImageKey: string | null;

  @Prop({
    type: {
      governorate: { type: String, required: true },
      district: { type: String, required: true },
    },
    required: false,
    default: null,
  })
  address: {
    governorate: string;
    district: string;
  } | null;

  // OTP

  @Prop({
    type: String,
  })
  otp?: string;

  @Prop({
    type: Date,
  })
  otpExpiry?: Date;

  // Refresh Token

  @Prop({
    type: String,
  })
  refreshToken?: string;

  // Location
  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: null,
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  } | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ location: '2dsphere' });
