import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppealsService } from './appeals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { AppealStatus } from '../../entities/appeal.entity';

@ApiTags('申诉')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AppealsController {
  constructor(private appeals: AppealsService) {}

  @Post('settlements/:id/appeal')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '工人对结算单发起申诉' })
  file(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string; evidence?: string[] },
  ) {
    return this.appeals.file(user.id, id, body.reason, body.evidence || []);
  }

  @Get('my/appeals')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '我的申诉（工人）' })
  myAppeals(@CurrentUser() user: AuthUser) {
    return this.appeals.myAppeals(user.id);
  }

  @Get('appeals')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '申诉工单列表（客服）' })
  listAll(@Query('status') status?: AppealStatus) {
    return this.appeals.listAll(status);
  }

  @Get('appeals/:id/evidence')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '申诉取证视图（签到轨迹/主管确认/照片/聊天记录）' })
  evidence(@Param('id', ParseIntPipe) id: number) {
    return this.appeals.evidence(id);
  }

  @Post('appeals/:id/resolve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '客服裁决：补发 / 维持 / 升级仲裁' })
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { action: 'reissue' | 'maintain' | 'escalate'; note?: string; reissueAmount?: number },
  ) {
    return this.appeals.resolve(user.id, id, body.action, body.note, body.reissueAmount);
  }
}
