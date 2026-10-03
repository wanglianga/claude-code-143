import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../entities/user.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';
import { WalletService } from '../wallet/wallet.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(WorkerProfile) private workerProfiles: Repository<WorkerProfile>,
    @InjectRepository(EnterpriseProfile) private enterpriseProfiles: Repository<EnterpriseProfile>,
    private wallet: WalletService,
    private risk: RiskService,
  ) {}

  /** 工人完善实名与资质（演示环境模拟实名核验通过） */
  async updateWorkerProfile(
    userId: number,
    dto: {
      realName: string;
      idCard: string;
      healthCertNo?: string;
      healthCertExpiry?: string;
      skills?: string[];
    },
  ) {
    if (!dto.realName || !dto.idCard) throw new BadRequestException('真实姓名与身份证必填');
    if (!/^\d{15}(\d{2}[0-9Xx])?$/.test(dto.idCard))
      throw new BadRequestException('身份证号格式不正确');
    let p = await this.workerProfiles.findOne({ where: { userId } });
    if (!p) p = this.workerProfiles.create({ userId });
    Object.assign(p, {
      realName: dto.realName,
      idCard: dto.idCard,
      healthCertNo: dto.healthCertNo || '',
      healthCertExpiry: dto.healthCertExpiry || null,
      skills: dto.skills || [],
      realNameVerified: true, // 演示环境：模拟公安实名核验通过
    });
    await this.users.update({ id: userId }, { name: dto.realName });
    return this.workerProfiles.save(p);
  }

  /** 签署用工风险告知书（报名前置条件） */
  async signRiskNotice(userId: number) {
    const p = await this.workerProfiles.findOne({ where: { userId } });
    if (!p || !p.realNameVerified) {
      throw new BadRequestException('请先完成实名认证再签署风险告知书');
    }
    p.riskNoticeSignedAt = new Date();
    return this.workerProfiles.save(p);
  }

  async workerProfile(userId: number) {
    const p = await this.workerProfiles.findOne({ where: { userId } });
    if (!p) throw new NotFoundException('工人资料不存在');
    return p;
  }

  /** 企业查看报名工人资料（脱敏身份证） */
  async workerProfileForEnterprise(workerUserId: number) {
    const p = await this.workerProfiles.findOne({ where: { userId: workerUserId } });
    if (!p) throw new NotFoundException('工人资料不存在');
    const user = await this.users.findOne({ where: { id: workerUserId } });
    return {
      ...p,
      idCard: p.idCard ? p.idCard.replace(/^(.{6}).+(.{4})$/, '$1********$2') : '',
      phone: user?.phone,
      name: user?.name,
    };
  }

  async enterpriseProfile(userId: number) {
    await this.risk.recomputeEnterprise(userId);
    const p = await this.enterpriseProfiles.findOne({ where: { userId } });
    if (!p) throw new NotFoundException('企业资料不存在');
    return p;
  }

  async updateEnterpriseProfile(
    userId: number,
    dto: { companyName?: string; creditCode?: string; contact?: string },
  ) {
    const p = await this.enterpriseProfiles.findOne({ where: { userId } });
    if (!p) throw new NotFoundException('企业资料不存在');
    Object.assign(p, dto);
    return this.enterpriseProfiles.save(p);
  }

  /** 企业创建现场主管账号 */
  async createSupervisor(
    enterpriseUserId: number,
    dto: { phone: string; password: string; name: string },
  ) {
    if (!/^\d{11}$/.test(dto.phone)) throw new BadRequestException('手机号需为 11 位数字');
    if (!dto.password || dto.password.length < 6) throw new BadRequestException('密码至少 6 位');
    const exists = await this.users.findOne({ where: { phone: dto.phone } });
    if (exists) throw new BadRequestException('该手机号已注册');
    const user = this.users.create({
      phone: dto.phone,
      passwordHash: bcrypt.hashSync(dto.password, 10),
      name: dto.name || '现场主管',
      role: UserRole.SUPERVISOR,
      enterpriseId: enterpriseUserId,
    });
    await this.users.save(user);
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async listSupervisors(enterpriseUserId: number) {
    return this.users.find({
      where: { enterpriseId: enterpriseUserId, role: UserRole.SUPERVISOR },
      select: ['id', 'phone', 'name', 'createdAt'],
    });
  }

  /** 主管校验：必须属于该企业 */
  async assertSupervisorOf(supervisorUserId: number, enterpriseUserId: number) {
    const u = await this.users.findOne({ where: { id: supervisorUserId } });
    if (!u || u.role !== UserRole.SUPERVISOR || u.enterpriseId !== enterpriseUserId) {
      throw new ForbiddenException('主管不属于该企业');
    }
    return u;
  }
}
