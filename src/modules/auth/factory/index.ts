import { BadRequestException, Injectable } from '@nestjs/common';
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
  private validateAge(dateOfBirth: string): void {
    const birthDate = new Date(dateOfBirth);

    if (
      Number.isNaN(birthDate.getTime()) ||
      birthDate.toISOString().slice(0, 10) !== dateOfBirth
    ) {
      throw new BadRequestException('Invalid date of birth');
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age < 21) {
      throw new BadRequestException(
        'You must be at least 21 years old to register',
      );
    }
  }

  // Create Customer Account

  async createCustomer(registerDto: RegisterDto): Promise<Customer> {
    this.validateAge(registerDto.dateOfBirth);
    const customer = new Customer();

    customer.firstName = registerDto.firstName.trim();
    customer.lastName = registerDto.lastName.trim();
    customer.email = registerDto.email.trim().toLowerCase();
    customer.phone = registerDto.phone.trim();
    customer.password = await bcrypt.hash(registerDto.password, 10);

    customer.dateOfBirth = new Date(registerDto.dateOfBirth);

    customer.role = UserRole.CUSTOMER;
    customer.authProvider = AuthProvider.LOCAL;
    customer.status = AccountStatus.PENDING;

    customer.emailVerified = false;
    customer.phoneVerified = false;

    customer.otp = generateOTP();
    customer.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Common default values
    customer.location = null;
    customer.address = null;
    customer.profileImageKey = null;

    return customer;
  }

  // Create Provider Account

  async createProvider(registerDto: RegisterDto): Promise<Provider> {
    this.validateAge(registerDto.dateOfBirth);
    const provider = new Provider();

    provider.firstName = registerDto.firstName.trim();
    provider.lastName = registerDto.lastName.trim();
    provider.email = registerDto.email.trim().toLowerCase();
    provider.phone = registerDto.phone.trim();
    provider.password = await bcrypt.hash(registerDto.password, 10);

    provider.dateOfBirth = new Date(registerDto.dateOfBirth);

    provider.role = UserRole.PROVIDER;
    provider.authProvider = AuthProvider.LOCAL;
    provider.status = AccountStatus.PENDING;

    provider.emailVerified = false;
    provider.phoneVerified = false;

    provider.otp = generateOTP();
    provider.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Common default values
    provider.location = null;
    provider.address = null;
    provider.profileImageKey = null;

    // Provider default values
    provider.verificationStatus = VerificationStatus.PENDING;
    provider.availabilityStatus = ProviderAvailability.OFFLINE;

    provider.ratingAvg = 0;
    provider.ratingCount = 0;
    provider.totalCompletedServices = 0;

    provider.workingHours = null;
    // provider.serviceAreas = [];

    // Profile fields - completed later
    provider.experience = null;

    // Identity images - uploaded later
    provider.idCardImageKey = null;
    provider.selfieImageKey = null;

    return provider;
  }
}
