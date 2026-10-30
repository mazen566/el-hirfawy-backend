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

  role: UserRole;
  authProvider: AuthProvider;
  status: AccountStatus;

  emailVerified: boolean;
  phoneVerified: boolean;

  otp?: string;
  otpExpiry?: Date;

  location: any | null;

  address: {
    governorate: string;
    district: string;
  } | null;

  profileImageKey: string | null;
}

export class Customer extends User {}

export class Provider extends User {
  title: string | null;
  bio: string | null;
  experience: number | null;

  idCardImageKey: string | null;
  selfieImageKey: string | null;

  verificationStatus: VerificationStatus;
  availabilityStatus: ProviderAvailability;

  ratingAvg: number;
  ratingCount: number;
  totalCompletedServices: number;

  workingHours: any[];
  serviceAreas: any[];
}

export class Admin extends User {}