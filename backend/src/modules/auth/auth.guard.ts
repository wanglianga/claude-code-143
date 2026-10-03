import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verify } from 'jsonwebtoken';
import { config } from '../../config';
import { UserRole } from '../../entities/user.entity';

export interface JwtPayload {
  sub: number;
  role: UserRole;
  name: string;
  enterpriseId?: number | null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('缺少登录令牌');
    try {
      req.user = verify(token, config.jwtSecret) as unknown as JwtPayload;
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    return true;
  }
}

export const ROLES_KEY = 'required_roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = ctx.switchToHttp().getRequest();
    if (!req.user) throw new UnauthorizedException();
    if (!required.includes(req.user.role)) {
      throw new ForbiddenException('当前账号无权进行此操作');
    }
    return true;
  }
}
