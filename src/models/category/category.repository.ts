import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Category, CategoryDocument } from './category.schema.js';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async findActive(): Promise<Category[]> {
    return this.categoryModel.find({ isActive: true }).lean();
  }

  async findInactive(): Promise<Category[]> {
    return this.categoryModel.find({ isActive: false }).lean();
  }

  async findAll(): Promise<Category[]> {
    return this.categoryModel.find().lean();
  }

  async findById(id: string): Promise<Category | null> {
    return this.categoryModel.findById(id).lean();
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoryModel.findOne({ slug }).lean();
  }

  async existsByName(name: string): Promise<boolean> {
    const result = await this.categoryModel.exists({ name });
    return result !== null && result !== undefined;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const result = await this.categoryModel.exists({ slug });
    return result !== null && result !== undefined;
  }

  async create(
    data: {
      name: string;
      slug: string;
      description?: string;
      isActive?: boolean;
    },
    session?: ClientSession,
  ): Promise<Category> {
    const created = new this.categoryModel(data);
    return created.save({ session });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description?: string;
      isActive: boolean;
    }>,
    session?: ClientSession,
  ): Promise<Category | null> {
    return this.categoryModel
      .findByIdAndUpdate(
        id,
        { $set: data },
        {
          new: true,
          session,
          runValidators: true,
        },
      )
      .lean();
  }

  async softDelete(id: string): Promise<Category | null> {
    return this.categoryModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .lean();
  }
}
