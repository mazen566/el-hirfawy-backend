import { Types } from 'mongoose';

export class Service {
  _id: Types.ObjectId;

  name: string;
  description: string;

  imageKey: string | null;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
