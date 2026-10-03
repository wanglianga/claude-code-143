import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../entities/user.entity';
import { WorkerProfile } from '../entities/worker-profile.entity';
import { EnterpriseProfile } from '../entities/enterprise-profile.entity';
import { Job } from '../entities/job.entity';
import { Application } from '../entities/application.entity';
import { Task } from '../entities/task.entity';
import { Attendance } from '../entities/attendance.entity';
import { InsurancePolicy } from '../entities/insurance-policy.entity';
import { Settlement } from '../entities/settlement.entity';
import { Appeal } from '../entities/appeal.entity';
import { Review } from '../entities/review.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { TaskEvent } from '../entities/task-event.entity';
import { RiskModule } from '../modules/risk/risk.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      WorkerProfile,
      EnterpriseProfile,
      Job,
      Application,
      Task,
      Attendance,
      InsurancePolicy,
      Settlement,
      Appeal,
      Review,
      ChatMessage,
      TaskEvent,
    ]),
    RiskModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}
