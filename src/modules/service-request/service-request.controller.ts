import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Auth, User, UserRole } from '../../common/index.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { ServiceRequestService } from './service-request.service.js';

@Controller('service-requests')
export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  @Post()
  @Auth(UserRole.CUSTOMER)
  async create(
    @Body() createDto: CreateServiceRequestDto,
    @User('_id') customerId: string,
  ) {
    return this.serviceRequestService.create(createDto, customerId);
  }

  @Get()
  @Auth(UserRole.CUSTOMER)
  async findMyRequests(@User('_id') customerId: string) {
    return this.serviceRequestService.findByCustomer(customerId);
  }

  @Get(':id')
  @Auth()
  async findOne(@Param('id') id: string, @User() user: any) {
    console.log('Request ID:', id);
    console.log('Authenticated User:', user);

    return this.serviceRequestService.findById(id, user._id, user.role);
  }
}
