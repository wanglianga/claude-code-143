import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../entities/user.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(WorkerProfile) private workerProfiles: Repository<WorkerProfile>,
    @InjectRepository(EnterpriseProfile) private enterpriseProfiles: Repository<EnterpriseProfile>,
    private jwtService: JwtService,
  ) {}

  async register(dto: {
    phone: string;
    password: string;
    name: string;
    role: UserRole;
    companyName?: string;
  }) {
    if (!/^\d{11}$/.test(dto.phone)) throw new BadRequestException('手机号需为 11 位数字');
    if (!dto.password || dto.password.length < 6)
      throw new BadRequestException('密码至少 6 位');
    if (![UserRole.WORKER, UserRole.ENTERPRISE].includes(dto.role))
      throw new BadRequestException('仅支持注册工人或企业账号');
    const exists = await this.users.findOne({ where: { phone: dto.phone } });
    if (exists) throw new BadRequestException('该手机号已注册');

    const user = this.users.create({
      phone: dto.phone,
      passwordHash: bcrypt.hashSync(dto.password, 10),
      name: dto.name || (dto.role === UserRole.ENTERPRISE ? '企业用户' : '工人'),
      role: dto.role,
    });
    await this.users.save(user);

    if (dto.role === UserRole.WORKER) {
      await this.workerProfiles.save(this.workerProfiles.create({ userId: user.id }));
    } else {
      await this.enterpriseProfiles.save(
        this.enterpriseProfiles.create({
          userId: user.id,
          companyName: dto.companyName || dto.name || '未命名企业',
        }),
      );
    }
    return this.login({ phone: dto.phone, password: dto.password });
  }

  async login(dto: { phone: string; password: string }) {
    const user = await this.users.findOne({ where: { phone: dto.phone } });
    if (!user || !bcrypt.compareSync(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('手机号或密码错误');
    }
    if (!user.active) throw new UnauthorizedException('账号已被禁用');
    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      phone: user.phone,
    });
    return { token, user: this.sanitize(user) };
  }

  async me(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    const result: any = { user: this.sanitize(user) };
    if (user.role === UserRole.WORKER) {
      result.workerProfile = await this.workerProfiles.findOne({ where: { userId } });
    }
    if (user.role === UserRole.ENTERPRISE || user.role === UserRole.SUPERVISOR) {
      const entUserId = user.role === UserRole.SUPERVISOR ? user.enterpriseId : user.id;
      result.enterpriseProfile = await this.enterpriseProfiles.findOne({
        where: { userId: entUserId },
      });
    }
    return result;
  }

  private sanitize(user: User) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
