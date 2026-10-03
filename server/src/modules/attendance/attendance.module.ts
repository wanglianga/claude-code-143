import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Attendance } from '../../entities/attendance.entity';
import { Task } from '../../entities/task.entity';
import { Job } from '../../entities/job.entity';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';
import { AuthModule } from '../auth/auth.module';
import { InsuranceModule } from '../insurance/insurance.module';
import { SettlementsModule } from '../settlements/settlements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, Task, Job, EnterpriseProfile]),
    AuthModule,
    InsuranceModule,
    SettlementsModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
