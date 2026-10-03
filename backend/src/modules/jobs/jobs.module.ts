import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User, Enterprise, Job, Assignment, AttendanceEvent, InsurancePolicy,
  JobEvent, Settlement, Appeal, Review,
} from '../../entities';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, Enterprise, Job, Assignment, AttendanceEvent, InsurancePolicy,
      JobEvent, Settlement, Appeal, Review,
    ]),
    TasksModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
