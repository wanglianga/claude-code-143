import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Enterprise, Job, InsurancePolicy, InjuryClaim, User,
} from '../../entities';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { EnterpriseModule } from '../enterprise/enterprise.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enterprise, Job, InsurancePolicy, InjuryClaim, User]),
    EnterpriseModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
