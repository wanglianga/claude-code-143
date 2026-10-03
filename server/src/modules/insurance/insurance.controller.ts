import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('保险')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InsuranceController {
  constructor(private insurance: InsuranceService) {}

  @Get('my/insurance')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '我的保单（工人）' })
  myPolicies(@CurrentUser() user: AuthUser) {
    return this.insurance.myPolicies(user.id);
  }

  @Post('insurance/:id/claim')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: '受伤理赔' })
  claim(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('description') description: string,
  ) {
    return this.insurance.claim(user.id, id, description);
  }
}
