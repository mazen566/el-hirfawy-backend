import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CategoryRepository } from '../../models/index.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  generateSlug(name: string): string {
    return name
      .normalize('NFC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '');
  }

  isValidSlug(slug: string): boolean {
    return slug.length > 0;
  }

  private validateId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }
  }

  private handleDuplicateError(error: any): never {
    if (error?.code === 11000 || error?.errorLabel?.includes('DuplicateKey')) {
      throw new ConflictException(
        'A category with this name or slug already exists',
      );
    }

    throw error;
  }

  async create(createDto: CreateCategoryDto): Promise<any> {
    const name = createDto.name.trim();
    const slug = this.generateSlug(name);

    if (!this.isValidSlug(slug)) {
      throw new BadRequestException(
        'Category name is invalid and cannot generate a valid slug',
      );
    }

    try {
      return await this.categoryRepository.create({
        name,
        slug,
        description: createDto.description?.trim(),
        isActive: false,
      });
    } catch (error: any) {
      this.handleDuplicateError(error);
    }
  }

  // Get active categories for customers and providers
  async findAll(): Promise<any[]> {
    return this.categoryRepository.findActive();
  }

  // Get inactive categories for admin review
  async findInactive(): Promise<any[]> {
    return this.categoryRepository.findInactive();
  }

  async findOne(id: string): Promise<any> {
    this.validateId(id);

    const category = await this.categoryRepository.findById(id);

    if (!category || !category.isActive) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateDto: UpdateCategoryDto): Promise<any> {
    this.validateId(id);

    const existing = await this.categoryRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const hasUpdates =
      updateDto.name !== undefined || updateDto.description !== undefined;

    if (!hasUpdates) {
      throw new BadRequestException('No valid fields provided for update');
    }

    const updates: Record<string, any> = {};

    if (updateDto.name !== undefined) {
      const newName = updateDto.name.trim();
      const newSlug = this.generateSlug(newName);

      if (!this.isValidSlug(newSlug)) {
        throw new BadRequestException(
          'Category name is invalid and cannot generate a valid slug',
        );
      }

      const existingByName =
        await this.categoryRepository.existsByName(newName);

      if (existingByName && existing.name !== newName) {
        throw new ConflictException('A category with this name already exists');
      }

      const existingBySlug = await this.categoryRepository.findBySlug(newSlug);

      if (existingBySlug && existing.slug !== newSlug) {
        throw new ConflictException(
          `Category with slug "${newSlug}" already exists`,
        );
      }

      updates.name = newName;
      updates.slug = newSlug;
    }

    if (updateDto.description !== undefined) {
      updates.description = updateDto.description.trim();
    }

    try {
      const updated = await this.categoryRepository.update(id, updates);

      if (!updated) {
        throw new NotFoundException('Category not found');
      }

      return updated;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.handleDuplicateError(error);
    }
  }

  // Admin approves a category
  async activate(id: string): Promise<any> {
    this.validateId(id);

    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.isActive) {
      throw new ConflictException('Category is already active');
    }

    const activated = await this.categoryRepository.update(id, {
      isActive: true,
    });

    if (!activated) {
      throw new NotFoundException('Category not found');
    }

    return this.categoryRepository.update(id, {
      isActive: true,
    });
  }

  // Admin deactivates a category
  async deactivate(id: string): Promise<any> {
    this.validateId(id);

    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (!category.isActive) {
      throw new ConflictException('Category is already deactivated');
    }

    const deactivated = await this.categoryRepository.softDelete(id);

    if (!deactivated) {
      throw new NotFoundException('Category not found');
    }

    return deactivated;
  }
}
