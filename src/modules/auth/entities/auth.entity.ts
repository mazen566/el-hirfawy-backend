import { Types } from 'mongoose';

import {
  AccountStatus,
  AuthProvider,
  UserRole,
} from '../../../common/index.js';

export class User {
  readonly _id: Types.ObjectId;

  // Basic Information

  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Authentication

  password: string;
  role: UserRole;
  authProvider: AuthProvider;

  // Account Status

  status: AccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;

  // Profile

  profileImage?: string;

  // OTP

  otp?: string;
  otpExpiry?: Date;

  // Refresh Token

  refreshToken?: string;
}
