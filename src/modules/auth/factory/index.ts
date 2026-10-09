import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { generateOTP } from '../../../common/helpers/otp.helpers.js';
import {
  AccountStatus,
  AuthProvider,
  ProviderAvailability,
  UserRole,
  VerificationStatus,
} from '../../../common/index.js';
import { Customer, Provider } from '../../../models/index.js';
import { RegisterDto } from '../dto/register.dto.js';

@Injectable()
export class AuthFactoryService {
  // Create Customer Account

  async createCustomer(registerDto: RegisterDto): Promise<Customer> {
    const customer = new Customer();

    customer.firstName = registerDto.firstName.trim();
    customer.lastName = registerDto.lastName.trim();
    customer.email = registerDto.email.trim().toLowerCase();
    customer.phone = registerDto.phone.trim();
    customer.password = await bcrypt.hash(registerDto.password, 10);
    customer.role = UserRole.CUSTOMER;
    customer.authProvider = AuthProvider.LOCAL;
    customer.status = AccountStatus.PENDING;
    customer.emailVerified = false;
    customer.phoneVerified = false;
    customer.otp = generateOTP();
    customer.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    return customer;
  }

  // Create Provider Account

  async createProvider(registerDto: RegisterDto): Promise<Provider> {
    const provider = new Provider();

    provider.firstName = registerDto.firstName.trim();
    provider.lastName = registerDto.lastName.trim();
    provider.email = registerDto.email.trim().toLowerCase();
    provider.phone = registerDto.phone.trim();
    provider.password = await bcrypt.hash(registerDto.password, 10);
    provider.role = UserRole.PROVIDER;
    provider.authProvider = AuthProvider.LOCAL;
    provider.status = AccountStatus.PENDING;
    provider.emailVerified = false;
    provider.phoneVerified = false;
    provider.otp = generateOTP();
    provider.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Provider Default Values

    provider.verificationStatus = VerificationStatus.PENDING;
    provider.availabilityStatus = ProviderAvailability.OFFLINE;
    provider.ratingAvg = 0;
    provider.ratingCount = 0;
    provider.totalCompletedServices = 0;
    provider.workingHours = [];
    provider.serviceAreas = [];

    return provider;
  }
}
