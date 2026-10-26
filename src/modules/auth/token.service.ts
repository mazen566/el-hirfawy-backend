import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/index.js';
import { UserRepository } from '../../models/user/user.repository.js';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async issueTokens(user: { _id: unknown; role: UserRole; email: string }) {
    const accessToken = this.jwtService.sign(
      {
        _id: user._id,
        role: user.role,
        email: user.email,
      },
      {
        secret: process.env.ACCESS_JWT_SECRET,
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      { _id: user._id },
      {
        secret: process.env.REFRESH_JWT_SECRET,
        expiresIn: '30d',
      },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.userRepository.updateOne(
      { _id: user._id! },
      { refreshToken: hashedRefreshToken },
    );

    return { accessToken, refreshToken };
  }
}
