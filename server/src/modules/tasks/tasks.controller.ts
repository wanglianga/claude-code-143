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
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { TaskEventType } from '../../entities/task-event.entity';

@ApiTags('任务')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get('my/tasks')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '我的任务（工人）' })
  myTasks(@CurrentUser() user: AuthUser) {
    return this.tasks.myTasks(user.id);
  }

  @Get('supervisor/tasks')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: '现场任务（主管）' })
  supervisorTasks(@CurrentUser() user: AuthUser) {
    return this.tasks.supervisorTasks(user);
  }

  @Get('jobs/:id/tasks')
  @Roles(UserRole.ENTERPRISE, UserRole.SUPERVISOR)
  @ApiOperation({ summary: '岗位任务列表（企业/主管）' })
  jobTasks(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasks.jobTasks(user, id);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: '任务全量详情（派单/考勤/保险/工时/事件/结算/评价/聊天）' })
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasks.detail(user, id);
  }

  @Post('tasks/:id/events')
  @ApiOperation({ summary: '上报任务事件（加班/调岗/早退/额外工作/受伤/扣款/备注）' })
  addEvent(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { type: TaskEventType; payload: Record<string, any> },
  ) {
    return this.tasks.addEvent(user, id, body.type, body.payload || {});
  }

  @Post('tasks/:id/chat')
  @ApiOperation({ summary: '任务内沟通（留痕，供争议取证）' })
  addChat(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
  ) {
    return this.tasks.addChat(user, id, content);
  }
}
