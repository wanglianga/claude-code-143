import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService, RegisterDto } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: { username: string; password: string }) {
    return this.auth.login(dto.username, dto.password);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.auth.me(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Post('worker-profile')
  completeProfile(@Req() req: any, @Body() dto: { idCardNo?: string; healthCertUntil?: string; faceSampleUrl?: string }) {
    return this.auth.completeWorkerProfile(req.user.sub, dto);
  }
}
