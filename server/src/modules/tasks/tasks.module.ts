import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from '../../entities/task.entity';
import { Job } from '../../entities/job.entity';
import { Attendance } from '../../entities/attendance.entity';
import { InsurancePolicy } from '../../entities/insurance-policy.entity';
import { TaskEvent } from '../../entities/task-event.entity';
import { Settlement } from '../../entities/settlement.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { Review } from '../../entities/review.entity';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      Job,
      Attendance,
      InsurancePolicy,
      TaskEvent,
      Settlement,
      ChatMessage,
      Review,
      User,
    ]),
    AuthModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
