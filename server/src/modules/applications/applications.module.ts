import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { Application } from '../../entities/application.entity';
import { Job } from '../../entities/job.entity';
import { Task } from '../../entities/task.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, Job, Task, WorkerProfile, User]),
    AuthModule,
    JobsModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
