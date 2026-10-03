import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { Job } from '../../entities/job.entity';
import { Application } from '../../entities/application.entity';
import { Task } from '../../entities/task.entity';
import { TaskEvent } from '../../entities/task-event.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Application, Task, TaskEvent, WorkerProfile]),
    AuthModule,
    WalletModule,
    RiskModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
