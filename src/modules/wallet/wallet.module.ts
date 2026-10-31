import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from './wallet.service.js';
import { Wallet, WalletSchema } from '../../models/wallet/wallet.schema.js';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
  ],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}