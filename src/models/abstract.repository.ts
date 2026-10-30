import {
  Model,
  ProjectionType,
  QueryFilter,
  QueryOptions,
  UpdateQuery,
} from 'mongoose';

export class AbstractRepository<T> {
  constructor(private readonly model: Model<T>) {}

  public async create(item: Partial<T>) {
    const doc = new this.model(item);
    return await doc.save();
  }

  public async getAllUsers() {
    return this.model
      .find({})
      .select('-password -otp -otpExpiry -refreshToken');
  }

  public async getOne(
    filter: QueryFilter<T>,
    projection?: ProjectionType<T>,
    options?: QueryOptions,
  ) {
    return this.model.findOne(filter, projection, options);
  }

  public async getAll(
    filter: QueryFilter<T>,
    projection?: ProjectionType<T>,
    options?: QueryOptions,
    query?: any,
  ) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 10;

    const skip = (page - 1) * limit;

    options = options || {};
    options.limit = limit;
    options.skip = skip;

    return this.model.find(filter, projection, options);
  }

  public async updateOne(
    filter: QueryFilter<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions<T>,
  ) {
    return await this.model.findOneAndUpdate(filter, update, options);
  }
}
