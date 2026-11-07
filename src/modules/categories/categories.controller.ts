import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Auth, UserRole } from '../../common/index.js';
import { CategoryService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // Get all active categories
  @Get()
  @Auth()
  async findAll() {
    return this.categoryService.findAll();
  }

  // Get inactive categories for admin review
  @Get('inactive')
  @Auth(UserRole.ADMIN)
  async findInactive() {
    return this.categoryService.findInactive();
  }

  // Get category by ID
  @Get(':id')
  @Auth()
  async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  // Provider and Admin can create categories
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Auth(UserRole.PROVIDER, UserRole.ADMIN)
  async create(@Body() createDto: CreateCategoryDto) {
    return this.categoryService.create(createDto);
  }

  // Admin can update categories
  @Patch(':id')
  @Auth(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateDto: UpdateCategoryDto) {
    return this.categoryService.update(id, updateDto);
  }

  // Admin approves and activates a category
  @Patch(':id/activate')
  @Auth(UserRole.ADMIN)
  async activate(@Param('id') id: string) {
    return this.categoryService.activate(id);
  }

  // Admin deactivates a category
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auth(UserRole.ADMIN)
  async deactivate(@Param('id') id: string) {
    return this.categoryService.deactivate(id);
  }
}
