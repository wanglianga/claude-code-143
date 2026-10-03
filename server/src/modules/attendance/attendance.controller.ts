import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('考勤')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private attendance: AttendanceService) {}

  @Get('tasks/:id/qrcode')
  @Roles(UserRole.ENTERPRISE, UserRole.SUPERVISOR)
  @ApiOperation({ summary: '获取签到二维码（企业/主管现场展示）' })
  getQrCode(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.attendance.getQrCode(user, id);
  }

  @Post('tasks/:id/check-in')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '工人签到（二维码+定位+人脸）' })
  checkIn(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { qrCode: string; lat: number; lng: number; faceImage?: string },
  ) {
    return this.attendance.checkIn(user.id, id, body);
  }

  @Post('tasks/:id/confirm-attendance')
  @Roles(UserRole.ENTERPRISE, UserRole.SUPERVISOR)
  @ApiOperation({ summary: '现场主管确认到岗（高风险必须）' })
  confirm(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.attendance.confirm(user, id);
  }

  @Post('tasks/:id/check-out')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '工人签退（生成日结单）' })
  checkOut(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.attendance.checkOut(user.id, id, body);
  }
}
