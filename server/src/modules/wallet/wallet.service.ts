import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';
import { WalletTransaction, WalletTxType } from '../../entities/wallet-transaction.entity';
import { round2 } from '../../common/utils';

/**
 * 企业保证金钱包：充值 / 冻结（发单预付）/ 解冻 / 支付 / 补偿。
 * 所有变动写流水，保证可追溯。
 */
@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(EnterpriseProfile)
    private profiles: Repository<EnterpriseProfile>,
    @InjectRepository(WalletTransaction)
    private txs: Repository<WalletTransaction>,
  ) {}

  async getProfile(userId: number): Promise<EnterpriseProfile> {
    const p = await this.profiles.findOne({ where: { userId } });
    if (!p) throw new BadRequestException('企业资料不存在');
    return p;
  }

  private async record(
    enterpriseUserId: number,
    type: WalletTxType,
    amount: number,
    balanceAfter: number,
    note: string,
    jobId?: number,
    taskId?: number,
  ) {
    await this.txs.save(
      this.txs.create({
        enterpriseId: enterpriseUserId,
        type,
        amount: round2(amount),
        balanceAfter: round2(balanceAfter),
        note,
        jobId: jobId ?? null,
        taskId: taskId ?? null,
      }),
    );
  }

  /** 充值保证金 */
  async recharge(enterpriseUserId: number, amount: number) {
    if (!amount || amount <= 0) throw new BadRequestException('充值金额需大于 0');
    const p = await this.getProfile(enterpriseUserId);
    p.depositBalance = round2(Number(p.depositBalance) + amount);
    await this.profiles.save(p);
    await this.record(enterpriseUserId, WalletTxType.RECHARGE, amount, p.depositBalance, '保证金充值');
    return p;
  }

  /** 发单冻结（企业预付款） */
  async freeze(enterpriseUserId: number, amount: number, jobId: number, note = '发单冻结保证金') {
    const p = await this.getProfile(enterpriseUserId);
    if (Number(p.depositBalance) < amount) {
      throw new BadRequestException(
        `保证金余额不足：需冻结 ¥${amount.toFixed(2)}，当前可用 ¥${Number(p.depositBalance).toFixed(2)}，请先充值`,
      );
    }
    p.depositBalance = round2(Number(p.depositBalance) - amount);
    p.frozenDeposit = round2(Number(p.frozenDeposit) + amount);
    await this.profiles.save(p);
    await this.record(enterpriseUserId, WalletTxType.FREEZE, amount, p.depositBalance, note, jobId);
    return p;
  }

  /** 解冻（取消/完结退回剩余保证金） */
  async unfreeze(enterpriseUserId: number, amount: number, jobId: number, note = '解冻保证金') {
    if (amount <= 0) return;
    const p = await this.getProfile(enterpriseUserId);
    const actual = Math.min(round2(amount), Number(p.frozenDeposit));
    p.frozenDeposit = round2(Number(p.frozenDeposit) - actual);
    p.depositBalance = round2(Number(p.depositBalance) + actual);
    await this.profiles.save(p);
    await this.record(enterpriseUserId, WalletTxType.UNFREEZE, actual, p.depositBalance, note, jobId);
    return p;
  }

  /** 从冻结保证金中支出（工资/补偿），冻结不足部分从可用余额扣除 */
  async spend(
    enterpriseUserId: number,
    amount: number,
    type: WalletTxType,
    note: string,
    jobId?: number,
    taskId?: number,
  ) {
    if (amount <= 0) return this.getProfile(enterpriseUserId);
    const p = await this.getProfile(enterpriseUserId);
    let remaining = round2(amount);
    const fromFrozen = Math.min(Number(p.frozenDeposit), remaining);
    p.frozenDeposit = round2(Number(p.frozenDeposit) - fromFrozen);
    remaining = round2(remaining - fromFrozen);
    if (remaining > 0) {
      p.depositBalance = round2(Number(p.depositBalance) - remaining);
    }
    await this.profiles.save(p);
    await this.record(enterpriseUserId, type, amount, p.depositBalance, note, jobId, taskId);
    return p;
  }

  async transactions(enterpriseUserId: number) {
    return this.txs.find({
      where: { enterpriseId: enterpriseUserId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
