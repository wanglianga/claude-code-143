import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { AppealsModule } from './modules/appeals/appeals.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { RiskModule } from './modules/risk/risk.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { UploadModule } from './modules/upload/upload.module';
import { SeedModule } from './seed/seed.module';
import { entities } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'daywork',
      entities,
      synchronize: true,
      charset: 'utf8mb4',
    }),
    AuthModule,
    UsersModule,
    JobsModule,
    ApplicationsModule,
    TasksModule,
    AttendanceModule,
    InsuranceModule,
    SettlementsModule,
    AppealsModule,
    ReviewsModule,
    RiskModule,
    WalletModule,
    UploadModule,
    SeedModule,
  ],
})
export class AppModule {}
