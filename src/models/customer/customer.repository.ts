import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository.js';
import { Customer } from './customer.schema.js';

@Injectable()
export class CustomerRepository extends AbstractRepository<Customer> {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<Customer>,
  ) {
    super(customerModel);
  }
}
