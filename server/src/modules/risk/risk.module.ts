import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskService } from './risk.service';
import { RiskController } from './risk.controller';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';
import { Job } from '../../entities/job.entity';
import { Task } from '../../entities/task.entity';
import { TaskEvent } from '../../entities/task-event.entity';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnterpriseProfile, Job, Task, TaskEvent, User]),
    AuthModule,
  ],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
