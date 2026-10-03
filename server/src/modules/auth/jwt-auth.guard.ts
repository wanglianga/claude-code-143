import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers['authorization'] as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录');
    }
    const token = auth.slice(7);
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.users.findOne({ where: { id: payload.sub } });
      if (!user || !user.active) throw new Error('inactive');
      request.user = {
        id: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        enterpriseId: user.enterpriseId,
      };
      return true;
    } catch {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }
  }
}
