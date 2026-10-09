import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository.js';
import { Admin } from './admin.schema.js';

@Injectable()
export class AdminRepository extends AbstractRepository<Admin> {
  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<Admin>,
  ) {
    super(adminModel);
  }
}
