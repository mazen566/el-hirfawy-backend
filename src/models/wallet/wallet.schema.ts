import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import type { Provider } from '../provider/provider.schema.js';

export type WalletDocument = Wallet & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
  },
})
export class Wallet {
  @Prop({
    type: Types.ObjectId,
    ref: 'Provider',
    required: true,
    unique: true,
  })
  providerId: Types.ObjectId;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  availableBalance: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  pendingCommission: number;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);