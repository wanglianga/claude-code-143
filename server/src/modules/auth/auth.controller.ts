import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '注册（工人/企业）' })
  register(
    @Body()
    body: {
      phone: string;
      password: string;
      name: string;
      role: UserRole;
      companyName?: string;
    },
  ) {
    return this.auth.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: '登录' })
  login(@Body() body: { phone: string; password: string }) {
    return this.auth.login(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '当前用户信息（含角色档案）' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
