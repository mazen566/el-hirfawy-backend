import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Category,
  CategoryRepository,
  CategorySchema,
} from '../../models/index.js';
import { CategoryController } from './categories.controller.js';
import { CategoryService } from './categories.service.js';
import { JwtService } from '@nestjs/jwt';
import { UserMongoModule } from '../../shared/index.js';

@Module({
  imports: [
    UserMongoModule,
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [CategoryController],
  providers: [CategoryService, CategoryRepository, JwtService],
  exports: [CategoryService],
})
export class CategoriesModule {}
