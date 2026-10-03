import {
  Body, Controller, Get, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { AuthGuard, Roles, RoleGuard } from '../auth/auth.guard';
import { JobsService, CreateJobDto } from './jobs.service';
import { currentQrToken, qrExpireSeconds } from '../../qrcode';

@Controller('api')
@UseGuards(AuthGuard, RoleGuard)
export class JobsController {
  constructor(private jobs: JobsService) {}

  // ---------- 岗位大厅 ----------
  @Get('jobs')
  list(@Query() q: any) {
    return this.jobs.listOpen({ industry: q.industry, q: q.q });
  }

  @Get('jobs/:id')
  detail(@Param('id') id: string, @Req() req: any) {
    return this.jobs.detail(Number(id), req.user.sub);
  }

  // 现场主管/企业获取动态签到二维码（每分钟轮换）
  @Roles('ENTERPRISE', 'SUPERVISOR')
  @Get('jobs/:id/qrcode')
  qrcode(@Param('id') id: string) {
    return { token: currentQrToken(Number(id)), expireSeconds: qrExpireSeconds() };
  }

  // ---------- 工人 ----------
  @Roles('WORKER')
  @Post('jobs/:id/apply')
  apply(@Param('id') id: string, @Body() dto: { riskAcknowledged?: boolean }, @Req() req: any) {
    return this.jobs.apply(req.user.sub, Number(id), !!dto.riskAcknowledged);
  }

  @Roles('WORKER')
  @Get('my/applications')
  mine(@Req() req: any) {
    return this.jobs.myApplications(req.user.sub);
  }

  @Roles('ENTERPRISE', 'SUPERVISOR')
  @Post('assignments/:id/review')
  review(@Param('id') id: string, @Body() dto: { accept: boolean }, @Req() req: any) {
    return this.jobs.reviewApplication(Number(id), req.user.enterpriseId, !!dto.accept);
  }

  // ---------- 企业 ----------
  @Roles('ENTERPRISE')
  @Post('jobs')
  create(@Body() dto: CreateJobDto, @Req() req: any) {
    return this.jobs.createJob(req.user.enterpriseId, dto);
  }

  @Roles('ENTERPRISE', 'SUPERVISOR')
  @Get('enterprise/jobs')
  myJobs(@Req() req: any) {
    return this.jobs.listByEnterprise(req.user.enterpriseId);
  }

  @Roles('ENTERPRISE', 'SUPERVISOR')
  @Get('jobs/:id/applicants')
  applicants(@Param('id') id: string, @Req() req: any) {
    return this.jobs.listApplicants(Number(id), req.user.enterpriseId);
  }

  @Roles('ENTERPRISE')
  @Post('jobs/:id/cancel')
  cancel(@Param('id') id: string, @Body() dto: { reason?: string }, @Req() req: any) {
    return this.jobs.cancelJob(Number(id), req.user.enterpriseId, dto.reason || '');
  }

  @Roles('ENTERPRISE')
  @Post('jobs/:id/prepayment')
  prepay(@Param('id') id: string, @Body() dto: { amount: number }, @Req() req: any) {
    return this.jobs.addPrepayment(Number(id), req.user.enterpriseId, Number(dto.amount));
  }
}
