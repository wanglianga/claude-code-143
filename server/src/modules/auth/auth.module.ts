import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, WorkerProfile, EnterpriseProfile]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'daywork-dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard, TypeOrmModule],
})
export class AuthModule {}
