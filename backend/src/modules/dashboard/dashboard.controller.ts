import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles, RoleGuard } from '../auth/auth.guard';
import { DashboardService } from './dashboard.service';
import { EnterpriseService } from '../enterprise/enterprise.service';

@Controller('api')
@UseGuards(AuthGuard, RoleGuard)
export class DashboardController {
  constructor(
    private dashboard: DashboardService,
    private entService: EnterpriseService,
  ) {}

  @Roles('ENTERPRISE')
  @Get('enterprise/home')
  home(@Req() req: any) {
    return this.dashboard.enterpriseHome(req.user.enterpriseId);
  }

  @Roles('ENTERPRISE')
  @Post('enterprise/deposit/recharge')
  recharge(@Req() req: any, @Body() dto: { amount: number }) {
    return this.entService.recharge(req.user.enterpriseId, Number(dto.amount));
  }

  @Get('industry-risks')
  industryRisks() {
    return this.dashboard.industryRisk();
  }

  @Roles('SUPPORT')
  @Get('support/overview')
  overview() {
    return this.dashboard.supportOverview();
  }
}
