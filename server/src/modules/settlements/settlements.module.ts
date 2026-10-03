import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementsService } from './settlements.service';
import { SettlementsController } from './settlements.controller';
import { Settlement } from '../../entities/settlement.entity';
import { Task } from '../../entities/task.entity';
import { Job } from '../../entities/job.entity';
import { Attendance } from '../../entities/attendance.entity';
import { TaskEvent } from '../../entities/task-event.entity';
import { InsurancePolicy } from '../../entities/insurance-policy.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Settlement,
      Task,
      Job,
      Attendance,
      TaskEvent,
      InsurancePolicy,
      WorkerProfile,
      EnterpriseProfile,
    ]),
    AuthModule,
    WalletModule,
    RiskModule,
  ],
  controllers: [SettlementsController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule {}
