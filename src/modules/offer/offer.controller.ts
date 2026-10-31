import { Controller, Post, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { OfferService } from './offer.service.js';
import { Types } from 'mongoose';
import { UserRole } from '../../common/enums/user.enums.js';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedUser {
  _id: Types.ObjectId;
  role: UserRole;
  [key: string]: any;
}

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

@Controller('offers')
@UseGuards(AuthGuard)
export class OfferController {
  constructor(private offerService: OfferService) {}

  @Post(':serviceRequestId')
  async submitOffer(
    @Param('serviceRequestId') serviceRequestId: Types.ObjectId,
    @Body('offeredPrice') offeredPrice: number,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user._id) {
      return { error: 'Provider ID not found in token' };
    }

    const result = await this.offerService.submitOffer(req.user._id, serviceRequestId, offeredPrice);

    if (!result.success) {
      return { error: result.error };
    }

    return { offer: result.offer };
  }

  @Post(':offerId/accept')
  async acceptOffer(
    @Param('offerId') offerId: Types.ObjectId,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user._id) {
      return { error: 'User ID not found in token' };
    }

    const result = await this.offerService.acceptOffer(offerId, req.user._id, req.user.role);

    if (!result.success) {
      return { error: result.error };
    }

    return { offer: result.offer, serviceRequest: result.serviceRequest };
  }

  @Post('confirm-completion')
  async confirmCompletion(
    @Body('serviceRequestId') serviceRequestId: Types.ObjectId,
    @Body('confirmationType') confirmationType: 'customer' | 'provider',
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user._id) {
      return { error: 'User ID not found in token' };
    }

    const result = await this.offerService.confirmCompletion(
      serviceRequestId,
      confirmationType,
      req.user._id,
      req.user.role,
    );

    if (!result.success) {
      return { error: result.error };
    }

    return { serviceRequest: result.serviceRequest, commissionReleased: result.commissionReleased };
  }

  @Post('cancel')
  async cancelServiceRequest(
    @Body('serviceRequestId') serviceRequestId: Types.ObjectId,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user._id) {
      return { error: 'User ID not found in token' };
    }

    const result = await this.offerService.cancelServiceRequest(serviceRequestId, req.user._id, req.user.role);

    if (!result.success) {
      return { error: result.error };
    }

    return { serviceRequest: result.serviceRequest, requiresAdminDecision: result.requiresAdminDecision };
  }
}

@Controller('admin/commissions')
@UseGuards(AuthGuard, RolesGuard)
@Roles([UserRole.ADMIN])
export class AdminCommissionController {
  constructor(private offerService: OfferService) {}

  @Post(':commissionId/decision')
  async makeDecision(
    @Param('commissionId') commissionId: Types.ObjectId,
    @Body('decision') decision: 'REFUND' | 'RELEASE',
  ) {
    const result = await this.offerService.adminDecideCommission(commissionId, decision);

    if (!result.success) {
      return { error: result.error };
    }

    return { success: true, action: result.action };
  }
}