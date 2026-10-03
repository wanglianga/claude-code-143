import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { Job, JobCategory } from '../../entities/job.entity';
import { INSURANCE_PLANS } from '../../common/constants';

@ApiTags('岗位')
@Controller('jobs')
export class JobsController {
  constructor(private jobs: JobsService) {}

  @Get('categories')
  @ApiOperation({ summary: '岗位类目' })
  categories() {
    return this.jobs.categories();
  }

  @Get('insurance-plans')
  @ApiOperation({ summary: '保险方案' })
  insurancePlans() {
    return INSURANCE_PLANS;
  }

  @Get()
  @ApiOperation({ summary: '岗位市场（工人浏览）' })
  list(@Query('category') category?: JobCategory, @Query('keyword') keyword?: string) {
    return this.jobs.listPublic({ category, keyword });
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENTERPRISE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '我发布的岗位（企业）' })
  mine(@CurrentUser() user: AuthUser) {
    return this.jobs.listMine(user.id);
  }

  @Post('deposit-preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENTERPRISE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发单保证金试算（按企业风险倍率）' })
  depositPreview(@CurrentUser() user: AuthUser, @Body() body: Partial<Job>) {
    return this.jobs.depositPreview(user.id, body);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENTERPRISE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建岗位（草稿）' })
  create(@CurrentUser() user: AuthUser, @Body() body: Partial<Job>) {
    return this.jobs.create(user.id, body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENTERPRISE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '编辑岗位（草稿）' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<Job>,
  ) {
    return this.jobs.update(user.id, id, body);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENTERPRISE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发布岗位（冻结保证金）' })
  publish(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.jobs.publish(user.id, id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENTERPRISE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消岗位（补偿已录用工人，影响取消率）' })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.jobs.cancel(user.id, id, reason);
  }

  @Get(':id')
  @ApiOperation({ summary: '岗位详情' })
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.jobs.detail(id);
  }
}
