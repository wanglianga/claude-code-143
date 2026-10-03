import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppealsService } from './appeals.service';
import { AppealsController } from './appeals.controller';
import { Appeal } from '../../entities/appeal.entity';
import { Settlement } from '../../entities/settlement.entity';
import { Task } from '../../entities/task.entity';
import { Job } from '../../entities/job.entity';
import { Attendance } from '../../entities/attendance.entity';
import { TaskEvent } from '../../entities/task-event.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { InsurancePolicy } from '../../entities/insurance-policy.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appeal,
      Settlement,
      Task,
      Job,
      Attendance,
      TaskEvent,
      ChatMessage,
      InsurancePolicy,
      WorkerProfile,
      EnterpriseProfile,
      User,
    ]),
    AuthModule,
    WalletModule,
    RiskModule,
  ],
  controllers: [AppealsController],
  providers: [AppealsService],
})
export class AppealsModule {}
