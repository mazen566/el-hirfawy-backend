import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { Model } from 'mongoose';
import { AppModule } from '../app.module.js';
import { AccountStatus, AuthProvider, UserRole } from '../common/index.js';
import { Admin } from '../models/index.js';
import { User } from '../models/user/user.schema.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    const adminModel = app.get<Model<Admin>>(getModelToken(Admin.name));

    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const firstName = process.env.ADMIN_FIRST_NAME?.trim() || 'System';
    const lastName = process.env.ADMIN_LAST_NAME?.trim() || 'Admin';
    const phone = process.env.ADMIN_PHONE?.trim();
    const dateOfBirth = process.env.ADMIN_DATE_OF_BIRTH;

    if (!email || !password || !phone || !dateOfBirth) {
      throw new Error(
        'ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE and ADMIN_DATE_OF_BIRTH are required in .env',
      );
    }

    if (password.length < 8)
      throw new Error('Admin password must be at least 8 characters');

    const parsedDateOfBirth = new Date(dateOfBirth);

    if (Number.isNaN(parsedDateOfBirth.getTime()))
      throw new Error('Invalid ADMIN_DATE_OF_BIRTH format');

    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      console.log('An account with this email already exists.');
      return;
    }

    const admin = new adminModel();

    admin.firstName = firstName;
    admin.lastName = lastName;
    admin.email = email;
    admin.phone = phone;
    admin.dateOfBirth = parsedDateOfBirth;
    admin.password = await bcrypt.hash(password, 10);
    admin.role = UserRole.ADMIN;
    admin.authProvider = AuthProvider.LOCAL;
    admin.status = AccountStatus.ACTIVE;
    admin.emailVerified = true;
    admin.phoneVerified = false;

    await admin.save();

    console.log('Admin account created successfully.');
    console.log(`Admin email: ${email}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('Failed to create admin:', error.message);
  process.exitCode = 1;
});
