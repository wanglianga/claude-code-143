import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettlementsService } from './settlements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('结算')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettlementsController {
  constructor(private settlements: SettlementsService) {}

  @Get('my/settlements')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '我的结算单（工人）' })
  mySettlements(@CurrentUser() user: AuthUser) {
    return this.settlements.mySettlements(user.id);
  }

  @Get('enterprise/settlements')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '企业结算单列表' })
  enterpriseSettlements(@CurrentUser() user: AuthUser) {
    return this.settlements.enterpriseSettlements(user.id);
  }

  @Post('settlements/:id/pay')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '企业确认并支付日结（从预付保证金划扣）' })
  pay(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.settlements.confirmAndPay(user.id, id);
  }
}
