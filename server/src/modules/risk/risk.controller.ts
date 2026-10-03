import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RiskService } from './risk.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';

@ApiTags('风险')
@Controller('risk')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RiskController {
  constructor(
    private risk: RiskService,
    @InjectRepository(EnterpriseProfile) private profiles: Repository<EnterpriseProfile>,
  ) {}

  @Get('enterprises')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '全部企业风险画像（客服/平台）' })
  enterprises() {
    return this.risk.listEnterprises();
  }

  @Get('industries')
  @Roles(UserRole.ADMIN, UserRole.ENTERPRISE)
  @ApiOperation({ summary: '行业岗位风险沉淀' })
  industries() {
    return this.risk.industryStats();
  }

  @Get('me')
  @Roles(UserRole.ENTERPRISE)
  @ApiOperation({ summary: '本企业风险画像' })
  async me(@CurrentUser() user: AuthUser) {
    await this.risk.recomputeEnterprise(user.id);
    return this.profiles.findOne({ where: { userId: user.id } });
  }
}
