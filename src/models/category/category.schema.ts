import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Category {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100,
  })
  name: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
  })
  slug: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 200,
  })
  description?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ isActive: 1 });
CategorySchema.index({ createdAt: -1 });
