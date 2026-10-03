import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('报名')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private applications: ApplicationsService) {}

  @Post('jobs/:id/apply')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '工人报名岗位' })
  apply(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.applications.apply(user.id, id);
  }

  @Get('my/applications')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '我的报名（工人）' })
  myApplications(@CurrentUser() user: AuthUser) {
    return this.applications.myApplications(user.id);
  }

  @Get('jobs/:id/applications')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '岗位报名列表（企业）' })
  jobApplications(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.applications.jobApplications(user.id, id);
  }

  @Post('applications/:id/approve')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '录用报名（生成派单任务）' })
  approve(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.applications.approve(user.id, id);
  }

  @Post('applications/:id/reject')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '拒绝报名' })
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.applications.reject(user.id, id, reason);
  }

  @Post('applications/:id/cancel')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '取消报名（工人）' })
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.applications.cancelByWorker(user.id, id);
  }
}
