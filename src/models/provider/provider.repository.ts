import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository.js';
import { Provider } from './provider.schema.js';

@Injectable()
export class ProviderRepository extends AbstractRepository<Provider> {
  constructor(
    @InjectModel(Provider.name) private readonly providerModel: Model<Provider>,
  ) {
    super(providerModel);
  }
}
