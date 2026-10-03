import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles, RoleGuard } from '../auth/auth.guard';
import { SettlementService } from './settlement.service';

@Controller('api/settlements')
@UseGuards(AuthGuard, RoleGuard)
export class SettlementController {
  constructor(private svc: SettlementService) {}

  @Roles('ENTERPRISE')
  @Post('pay')
  pay(@Body() dto: { assignmentIds: number[] }, @Req() req: any) {
    return this.svc.confirmAndPay(dto.assignmentIds || [], req.user.enterpriseId);
  }

  /** 企业查看某岗位全部日结单并触发重算/发放 */
  @Roles('ENTERPRISE')
  @Post('job/:id/generate')
  async generateJob(@Param('id') id: string, @Req() req: any) {
    const list = await this.svc.listByJob(Number(id));
    const regenerated = [];
    for (const s of list) {
      if (s.enterpriseId !== req.user.enterpriseId) continue;
      if (s.status !== 'PAID' && s.status !== 'ADJUSTED') {
        regenerated.push(await this.svc.generate(s.assignmentId));
      } else {
        regenerated.push(s);
      }
    }
    return regenerated;
  }

  @Get('assignment/:id')
  byAssignment(@Param('id') id: string) {
    return this.svc.listByAssignment(Number(id));
  }

  @Get()
  async list(@Query() q: any, @Req() req: any) {
    if (q.jobId) return this.svc.listByJob(Number(q.jobId));
    if (req.user.role === 'WORKER') return this.svc.listByWorker(req.user.sub);
    return [];
  }

  @Get('assignment/:id/evidence')
  evidence(@Param('id') id: string) {
    return this.svc.buildEvidence(Number(id));
  }
}
