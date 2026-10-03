import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceService } from './insurance.service';
import { InsuranceController } from './insurance.controller';
import { InsurancePolicy } from '../../entities/insurance-policy.entity';
import { Task } from '../../entities/task.entity';
import { Job } from '../../entities/job.entity';
import { TaskEvent } from '../../entities/task-event.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InsurancePolicy, Task, Job, TaskEvent]),
    AuthModule,
  ],
  controllers: [InsuranceController],
  providers: [InsuranceService],
  exports: [InsuranceService],
})
export class InsuranceModule {}
