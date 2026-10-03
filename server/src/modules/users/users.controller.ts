import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { WalletService } from '../wallet/wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('用户')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private users: UsersService,
    private wallet: WalletService,
  ) {}

  // ---- 工人 ----
  @Get('worker/profile')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '我的工人档案' })
  workerProfile(@CurrentUser() user: AuthUser) {
    return this.users.workerProfile(user.id);
  }

  @Put('worker/profile')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '完善实名与资质（模拟实名核验）' })
  updateWorkerProfile(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.users.updateWorkerProfile(user.id, body);
  }

  @Post('worker/risk-notice')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '签署用工风险告知书' })
  signRiskNotice(@CurrentUser() user: AuthUser) {
    return this.users.signRiskNotice(user.id);
  }

  @Get('workers/:id/profile')
  @Roles(UserRole.ENTERPRISE, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({ summary: '查看工人资料（企业/主管/客服）' })
  workerProfileForEnterprise(@Param('id', ParseIntPipe) id: number) {
    return this.users.workerProfileForEnterprise(id);
  }

  // ---- 企业 ----
  @Get('enterprise/profile')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '我的企业档案（含风险等级与保证金）' })
  enterpriseProfile(@CurrentUser() user: AuthUser) {
    return this.users.enterpriseProfile(user.id);
  }

  @Put('enterprise/profile')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '完善企业资料' })
  updateEnterpriseProfile(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.users.updateEnterpriseProfile(user.id, body);
  }

  @Post('enterprise/deposit/recharge')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '保证金充值' })
  recharge(@CurrentUser() user: AuthUser, @Body('amount') amount: number) {
    return this.wallet.recharge(user.id, Number(amount));
  }

  @Get('enterprise/wallet')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '保证金流水' })
  walletTxs(@CurrentUser() user: AuthUser) {
    return this.wallet.transactions(user.id);
  }

  @Post('enterprise/supervisors')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '创建现场主管账号' })
  createSupervisor(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.users.createSupervisor(user.id, body);
  }

  @Get('enterprise/supervisors')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '主管账号列表' })
  listSupervisors(@CurrentUser() user: AuthUser) {
    return this.users.listSupervisors(user.id);
  }
}
