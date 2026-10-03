import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EnterpriseProfile, WalletTransaction])],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
