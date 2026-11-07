import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryService } from './categories.service.js';

describe('CategoryService', () => {
  let categoryRepository: any;
  let service: CategoryService;

  const validId = () => new Types.ObjectId().toString();

  const mockCategory = (overrides: Partial<any> = {}) => ({
    _id: new Types.ObjectId(),
    name: 'Test Category',
    slug: 'test-category',
    isActive: true,
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    categoryRepository = {
      findActive: vi.fn(),
      findInactive: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      existsByName: vi.fn(),
      existsBySlug: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    };

    vi.clearAllMocks();

    service = new CategoryService(categoryRepository as any);
  });

  // =========================
  // generateSlug()
  // =========================

  describe('generateSlug()', () => {
    it('should generate an English slug correctly', () => {
      expect(service.generateSlug('Home Services')).toBe('home-services');
    });

    it('should generate an Arabic Unicode slug correctly', () => {
      expect(service.generateSlug('خدمات منزلية')).toBe('خدمات-منزلية');
    });

    it('should remove special characters', () => {
      expect(service.generateSlug('Home @ Services!!!')).toBe('home-services');
    });

    it('should trim spaces and convert text to lowercase', () => {
      expect(service.generateSlug('  HOME SERVICES  ')).toBe('home-services');
    });
  });

  // =========================
  // create()
  // =========================

  describe('create()', () => {
    it('should create a category successfully with isActive false', async () => {
      const createdCategory = mockCategory({
        isActive: false,
      });

      categoryRepository.create.mockResolvedValue(createdCategory);

      const result = await service.create({
        name: 'Test Category',
        description: 'Test',
      });

      expect(result).toEqual(createdCategory);

      expect(categoryRepository.create).toHaveBeenCalledWith({
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test',
        isActive: false,
      });
    });

    it('should generate an English slug correctly', async () => {
      categoryRepository.create.mockResolvedValue(mockCategory());

      await service.create({
        name: 'Home Services',
        description: 'Home services',
      });

      expect(categoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'home-services',
        }),
      );
    });

    it('should generate an Arabic Unicode slug correctly', async () => {
      const arabicName = 'خدمات منزلية';
      const expectedSlug = 'خدمات-منزلية';

      categoryRepository.create.mockResolvedValue(
        mockCategory({
          name: arabicName,
          slug: expectedSlug,
          isActive: false,
        }),
      );

      await service.create({
        name: arabicName,
        description: 'Arabic services',
      });

      expect(categoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: expectedSlug,
          isActive: false,
        }),
      );
    });

    it('should reject a name that produces an empty slug', async () => {
      await expect(
        service.create({
          name: '!!!',
          description: 'Invalid',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(categoryRepository.create).not.toHaveBeenCalled();
    });

    it('should reject duplicate category names', async () => {
      categoryRepository.create.mockRejectedValue({
        code: 11000,
      });

      await expect(
        service.create({
          name: 'Existing Category',
          description: 'Duplicate',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle MongoDB duplicate-key error for slug conflict', async () => {
      categoryRepository.create.mockRejectedValue({
        code: 11000,
        keyPattern: { slug: 1 },
      });

      await expect(
        service.create({
          name: 'Test Category',
          description: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle duplicate-key error label', async () => {
      categoryRepository.create.mockRejectedValue({
        errorLabel: ['DuplicateKey'],
      });

      await expect(
        service.create({
          name: 'Another Name',
          description: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle optional description when not provided', async () => {
      categoryRepository.create.mockResolvedValue(
        mockCategory({
          description: undefined,
          isActive: false,
        }),
      );

      await service.create({
        name: 'Test Category',
      });

      expect(categoryRepository.create).toHaveBeenCalledWith({
        name: 'Test Category',
        slug: 'test-category',
        description: undefined,
        isActive: false,
      });
    });

    it('should rethrow unexpected repository errors', async () => {
      const error = new Error('Database connection failed');

      categoryRepository.create.mockRejectedValue(error);

      await expect(
        service.create({
          name: 'Test Category',
        }),
      ).rejects.toThrow('Database connection failed');
    });
  });

  // =========================
  // findAll()
  // =========================

  describe('findAll()', () => {
    it('should return active categories from repository', async () => {
      const activeCategories = [
        mockCategory(),
        mockCategory({ name: 'Second Category' }),
      ];

      categoryRepository.findActive.mockResolvedValue(activeCategories);

      const result = await service.findAll();

      expect(result).toEqual(activeCategories);
      expect(categoryRepository.findActive).toHaveBeenCalledOnce();
    });

    it('should return an empty array when no active categories exist', async () => {
      categoryRepository.findActive.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // =========================
  // findInactive()
  // =========================

  describe('findInactive()', () => {
    it('should return inactive categories from repository', async () => {
      const inactiveCategories = [
        mockCategory({ isActive: false }),
        mockCategory({
          name: 'Pending Category',
          isActive: false,
        }),
      ];

      categoryRepository.findInactive.mockResolvedValue(inactiveCategories);

      const result = await service.findInactive();

      expect(result).toEqual(inactiveCategories);
      expect(categoryRepository.findInactive).toHaveBeenCalledOnce();
    });

    it('should return an empty array when no inactive categories exist', async () => {
      categoryRepository.findInactive.mockResolvedValue([]);

      const result = await service.findInactive();

      expect(result).toEqual([]);
    });
  });

  // =========================
  // findOne()
  // =========================

  describe('findOne()', () => {
    it('should return an existing active category', async () => {
      const id = validId();
      const activeCategory = mockCategory();

      categoryRepository.findById.mockResolvedValue(activeCategory);

      const result = await service.findOne(id);

      expect(result).toEqual(activeCategory);
      expect(categoryRepository.findById).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(validId())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when category is inactive', async () => {
      categoryRepository.findById.mockResolvedValue(
        mockCategory({ isActive: false }),
      );

      await expect(service.findOne(validId())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        BadRequestException,
      );

      expect(categoryRepository.findById).not.toHaveBeenCalled();
    });
  });

  // =========================
  // update()
  // =========================

  describe('update()', () => {
    it('should update category name and regenerate its slug', async () => {
      const id = validId();

      const existingCategory = mockCategory({
        name: 'Old Name',
        slug: 'old-name',
      });

      const updatedCategory = mockCategory({
        name: 'New Name',
        slug: 'new-name',
      });

      categoryRepository.findById.mockResolvedValue(existingCategory);
      categoryRepository.existsByName.mockResolvedValue(false);
      categoryRepository.findBySlug.mockResolvedValue(null);
      categoryRepository.update.mockResolvedValue(updatedCategory);

      const result = await service.update(id, {
        name: 'New Name',
      });

      expect(result).toEqual(updatedCategory);

      expect(categoryRepository.update).toHaveBeenCalledWith(id, {
        name: 'New Name',
        slug: 'new-name',
      });
    });

    it('should update category description', async () => {
      const id = validId();

      const existingCategory = mockCategory();

      const updatedCategory = mockCategory({
        description: 'New description',
      });

      categoryRepository.findById.mockResolvedValue(existingCategory);
      categoryRepository.update.mockResolvedValue(updatedCategory);

      const result = await service.update(id, {
        description: 'New description',
      });

      expect(result).toEqual(updatedCategory);

      expect(categoryRepository.update).toHaveBeenCalledWith(id, {
        description: 'New description',
      });
    });

    it('should reject an empty update DTO', async () => {
      const id = validId();

      categoryRepository.findById.mockResolvedValue(mockCategory());

      await expect(service.update(id, {})).rejects.toThrow(BadRequestException);

      expect(categoryRepository.update).not.toHaveBeenCalled();
    });

    it('should reject duplicate category name', async () => {
      const id = validId();

      const existingCategory = mockCategory();

      categoryRepository.findById.mockResolvedValue(existingCategory);
      categoryRepository.existsByName.mockResolvedValue(true);

      await expect(
        service.update(id, {
          name: 'Duplicate Name',
        }),
      ).rejects.toThrow(ConflictException);

      expect(categoryRepository.update).not.toHaveBeenCalled();
    });

    it('should reject duplicate category slug', async () => {
      const id = validId();

      const existingCategory = mockCategory();

      categoryRepository.findById.mockResolvedValue(existingCategory);
      categoryRepository.existsByName.mockResolvedValue(false);

      categoryRepository.findBySlug.mockResolvedValue(
        mockCategory({
          name: 'Other Category',
          slug: 'new-name',
        }),
      );

      await expect(
        service.update(id, {
          name: 'New Name',
        }),
      ).rejects.toThrow(ConflictException);

      expect(categoryRepository.update).not.toHaveBeenCalled();
    });

    it('should reject a name that produces an empty slug', async () => {
      const id = validId();

      categoryRepository.findById.mockResolvedValue(mockCategory());

      await expect(
        service.update(id, {
          name: '!!!',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(categoryRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(validId(), {
          name: 'New Name',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(
        service.update('invalid-id', {
          name: 'New Name',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(categoryRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle duplicate-key errors during update', async () => {
      const id = validId();

      categoryRepository.findById.mockResolvedValue(mockCategory());
      categoryRepository.existsByName.mockResolvedValue(false);
      categoryRepository.findBySlug.mockResolvedValue(null);

      categoryRepository.update.mockRejectedValue({
        code: 11000,
      });

      await expect(
        service.update(id, {
          name: 'New Name',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when update returns null', async () => {
      const id = validId();

      categoryRepository.findById.mockResolvedValue(mockCategory());
      categoryRepository.update.mockResolvedValue(null);

      await expect(
        service.update(id, {
          description: 'New description',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================
  // activate()
  // =========================

  describe('activate()', () => {
    it('should activate an inactive category successfully', async () => {
      const id = validId();

      const inactiveCategory = mockCategory({
        isActive: false,
      });

      const activatedCategory = mockCategory({
        isActive: true,
      });

      categoryRepository.findById.mockResolvedValue(inactiveCategory);
      categoryRepository.update.mockResolvedValue(activatedCategory);

      const result = await service.activate(id);

      expect(result).toEqual(activatedCategory);

      expect(categoryRepository.update).toHaveBeenCalledWith(id, {
        isActive: true,
      });
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(service.activate(validId())).rejects.toThrow(
        NotFoundException,
      );

      expect(categoryRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when category is already active', async () => {
      categoryRepository.findById.mockResolvedValue(
        mockCategory({ isActive: true }),
      );

      await expect(service.activate(validId())).rejects.toThrow(
        ConflictException,
      );

      expect(categoryRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.activate('invalid-id')).rejects.toThrow(
        BadRequestException,
      );

      expect(categoryRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when activation returns null', async () => {
      const id = validId();

      categoryRepository.findById.mockResolvedValue(
        mockCategory({ isActive: false }),
      );

      categoryRepository.update.mockResolvedValue(null);

      await expect(service.activate(id)).rejects.toThrow(NotFoundException);
    });
  });

  // =========================
  // deactivate()
  // =========================

  describe('deactivate()', () => {
    it('should deactivate a category by setting isActive to false', async () => {
      const id = validId();

      const activeCategory = mockCategory({
        isActive: true,
      });

      const deactivatedCategory = mockCategory({
        isActive: false,
      });

      categoryRepository.findById.mockResolvedValue(activeCategory);
      categoryRepository.softDelete.mockResolvedValue(deactivatedCategory);

      const result = await service.deactivate(id);

      expect(result).toEqual(deactivatedCategory);

      expect(categoryRepository.softDelete).toHaveBeenCalledWith(id);
    });

    it('should not physically delete the category', async () => {
      const id = validId();

      categoryRepository.findById.mockResolvedValue(
        mockCategory({ isActive: true }),
      );

      categoryRepository.softDelete.mockResolvedValue(
        mockCategory({ isActive: false }),
      );

      await service.deactivate(id);

      expect(categoryRepository.softDelete).toHaveBeenCalledOnce();
    });

    it('should throw ConflictException when category is already inactive', async () => {
      categoryRepository.findById.mockResolvedValue(
        mockCategory({ isActive: false }),
      );

      await expect(service.deactivate(validId())).rejects.toThrow(
        ConflictException,
      );

      expect(categoryRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoryRepository.findById.mockResolvedValue(null);

      await expect(service.deactivate(validId())).rejects.toThrow(
        NotFoundException,
      );

      expect(categoryRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.deactivate('invalid-id')).rejects.toThrow(
        BadRequestException,
      );

      expect(categoryRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when softDelete returns null', async () => {
      const id = validId();

      categoryRepository.findById.mockResolvedValue(
        mockCategory({ isActive: true }),
      );

      categoryRepository.softDelete.mockResolvedValue(null);

      await expect(service.deactivate(id)).rejects.toThrow(NotFoundException);
    });
  });
});
