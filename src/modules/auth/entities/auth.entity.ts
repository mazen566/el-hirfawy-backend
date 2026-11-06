import { Types } from 'mongoose';
import {
  AccountStatus,
  AuthProvider,
  ProviderAvailability,
  UserRole,
  VerificationStatus,
} from '../../../common/index.js';

export class User {
  _id: Types.ObjectId;

  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth: Date;

  role: UserRole;
  authProvider: AuthProvider;
  status: AccountStatus;

  emailVerified: boolean;
  phoneVerified: boolean;

  otp?: string;
  otpExpiry?: Date;

  location: {
    type: 'Point';
    coordinates: [number, number];
  } | null;

  address: {
    governorate: string;
    district: string;
    street: string;
  } | null;

  profileImageKey: string | null;
}

export class Customer extends User {}

export class Provider extends User {
  service: string | null;
  experience: string | null;

  idCardImageKey: string | null;
  selfieImageKey: string | null;

  verificationStatus: VerificationStatus;
  availabilityStatus: ProviderAvailability;

  ratingAvg: number;
  ratingCount: number;
  totalCompletedServices: number;

  workingHours: {
    from: string;
    to: string;
  } | null;

  // serviceAreas: any[];
}

export class Admin extends User {}
