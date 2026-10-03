import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settlement, SettlementStatus } from '../../entities/settlement.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { Job, JobStatus } from '../../entities/job.entity';
import { Attendance } from '../../entities/attendance.entity';
import { TaskEvent, TaskEventType } from '../../entities/task-event.entity';
import { InsurancePolicy } from '../../entities/insurance-policy.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';
import { WalletService } from '../wallet/wallet.service';
import { WalletTxType } from '../../entities/wallet-transaction.entity';
import { RiskService } from '../risk/risk.service';
import { floorHalfHour, hoursBetween, round2 } from '../../common/utils';
import { PLATFORM_FEE_RATE } from '../../common/constants';

/**
 * 日结结算：
 * 应发 = 基础工时工资 + 加班费 + 餐补 - 迟到扣款 - 其他扣款
 * 工人实收 = 应发 - 保费
 * 企业另付平台服务费；支付来源为企业发单时冻结的预付保证金。
 */
@Injectable()
export class SettlementsService {
  constructor(
    @InjectRepository(Settlement) private settlements: Repository<Settlement>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Job) private jobs: Repository<Job>,
    @InjectRepository(Attendance) private attendances: Repository<Attendance>,
    @InjectRepository(TaskEvent) private events: Repository<TaskEvent>,
    @InjectRepository(InsurancePolicy) private policies: Repository<InsurancePolicy>,
    @InjectRepository(WorkerProfile) private workerProfiles: Repository<WorkerProfile>,
    @InjectRepository(EnterpriseProfile) private enterpriseProfiles: Repository<EnterpriseProfile>,
    private wallet: WalletService,
    private risk: RiskService,
  ) {}

  /** 签退后自动生成结算单（幂等） */
  async generateForTask(taskId: number): Promise<Settlement> {
    const existing = await this.settlements.findOne({ where: { taskId } });
    if (existing) return existing;

    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    const job = await this.jobs.findOne({ where: { id: task.jobId } });
    const attendance = await this.attendances.findOne({ where: { taskId } });
    if (!job || !attendance || !attendance.checkInTime || !attendance.checkOutTime) {
      throw new BadRequestException('考勤记录不完整，无法结算');
    }

    const scheduledHours = Math.max(
      0.5,
      floorHalfHour(hoursBetween(new Date(job.startTime), new Date(job.endTime))),
    );
    const actualHours = Number(attendance.effectiveHours) || 0;

    // 事件汇总
    const events = await this.events.find({ where: { taskId } });
    const overtimeHours = events
      .filter((e) => e.type === TaskEventType.OVERTIME)
      .reduce((s, e) => s + Number(e.payload?.hours || 0), 0);
    const deductionEvents = events.filter((e) => e.type === TaskEventType.DEDUCTION);
    const otherDeductions = round2(
      deductionEvents.reduce((s, e) => s + Number(e.payload?.amount || 0), 0),
    );
    const deductionReason = deductionEvents
      .map((e) => e.payload?.reason)
      .filter(Boolean)
      .join('；');

    // 工时：基础工时不超过排班工时；加班费按企业/主管确认的加班事件计酬
    const baseHours = Math.min(actualHours, scheduledHours);
    const paidOvertimeHours = overtimeHours;

    const hourly = Number(job.hourlyWage);
    const baseAmount = round2(baseHours * hourly);
    const overtimeRate = Number(job.overtimeWage) || hourly * 1.5;
    const overtimeAmount = round2(paidOvertimeHours * overtimeRate);

    // 迟到扣款
    const lateMinutes = attendance.lateMinutes || 0;
    const lateDeduction = round2(lateMinutes * Number(job.lateDeductPerMinute || 0));

    // 餐补：有效工时满 4 小时发放
    const mealAllowance = actualHours >= 4 ? Number(job.mealAllowance || 0) : 0;

    // 保费
    const policy = await this.policies.findOne({ where: { taskId } });
    const insurancePremium = policy ? Number(policy.premium) : 0;

    const gross = round2(baseAmount + overtimeAmount + mealAllowance - lateDeduction - otherDeductions);
    const platformFee = round2((baseAmount + overtimeAmount) * PLATFORM_FEE_RATE);
    const net = round2(gross - insurancePremium);

    const items = [
      { label: `基础工时 ${baseHours}h × ¥${hourly}/h`, amount: baseAmount },
      ...(paidOvertimeHours > 0
        ? [{ label: `加班 ${paidOvertimeHours}h × ¥${round2(overtimeRate)}/h`, amount: overtimeAmount }]
        : []),
      ...(mealAllowance > 0 ? [{ label: '餐补', amount: mealAllowance }] : []),
      ...(lateDeduction > 0
        ? [{ label: `迟到 ${lateMinutes} 分钟扣款`, amount: -lateDeduction }]
        : []),
      ...(otherDeductions > 0
        ? [{ label: `其他扣款（${deductionReason || '企业扣款'}）`, amount: -otherDeductions }]
        : []),
      { label: '应发合计（企业预付保证金支付）', amount: gross },
      ...(insurancePremium > 0
        ? [{ label: `意外保险保费（${policy.plan}）`, amount: -insurancePremium }]
        : []),
      { label: '工人实收', amount: net },
      { label: `平台服务费（企业另付 ${PLATFORM_FEE_RATE * 100}%）`, amount: platformFee },
    ];

    const settlement = this.settlements.create({
      taskId,
      workerId: task.workerId,
      enterpriseId: task.enterpriseId,
      jobId: task.jobId,
      scheduledHours,
      actualHours,
      baseHours,
      overtimeHours: paidOvertimeHours,
      baseAmount,
      overtimeAmount,
      lateMinutes,
      lateDeduction,
      mealAllowance,
      otherDeductions,
      deductionReason,
      insurancePremium,
      grossAmount: Math.max(0, gross),
      platformFee,
      netAmount: Math.max(0, net),
      items,
      status: SettlementStatus.PENDING,
    });
    return this.settlements.save(settlement);
  }

  async byTask(taskId: number) {
    return this.settlements.findOne({ where: { taskId } });
  }

  async mySettlements(workerUserId: number) {
    const list = await this.settlements.find({
      where: { workerId: workerUserId },
      order: { createdAt: 'DESC' },
    });
    return this.withJobTitles(list);
  }

  async enterpriseSettlements(enterpriseUserId: number) {
    const list = await this.settlements.find({
      where: { enterpriseId: enterpriseUserId },
      order: { createdAt: 'DESC' },
    });
    return this.withJobTitles(list);
  }

  private async withJobTitles(list: Settlement[]) {
    const result = [];
    for (const s of list) {
      const job = await this.jobs.findOne({ where: { id: s.jobId } });
      result.push({ ...s, jobTitle: job?.title });
    }
    return result;
  }

  /** 企业确认并支付：从冻结保证金划扣工资+服务费，工人入账 */
  async confirmAndPay(enterpriseUserId: number, settlementId: number) {
    const s = await this.settlements.findOne({ where: { id: settlementId } });
    if (!s || s.enterpriseId !== enterpriseUserId) throw new NotFoundException('结算单不存在');
    if (s.status !== SettlementStatus.PENDING) {
      throw new BadRequestException('结算单已支付或申诉处理中');
    }
    const total = round2(Number(s.grossAmount) + Number(s.platformFee));
    await this.wallet.spend(
      enterpriseUserId,
      total,
      WalletTxType.PAYMENT,
      `日结工资 ¥${s.grossAmount} + 平台服务费 ¥${s.platformFee}`,
      s.jobId,
      s.taskId,
    );
    // 工人入账
    const wp = await this.workerProfiles.findOne({ where: { userId: s.workerId } });
    if (wp) {
      wp.balance = round2(Number(wp.balance) + Number(s.netAmount));
      wp.totalJobs += 1;
      await this.workerProfiles.save(wp);
    }
    s.status = SettlementStatus.CONFIRMED;
    s.paidAt = new Date();
    await this.settlements.save(s);

    // 任务完结；若岗位全部任务完结则完结岗位并退回剩余保证金
    const task = await this.tasks.findOne({ where: { id: s.taskId } });
    if (task) {
      task.status = TaskStatus.SETTLED;
      await this.tasks.save(task);
    }
    const ep = await this.enterpriseProfiles.findOne({ where: { userId: enterpriseUserId } });
    if (ep) {
      ep.settledJobs += 1;
      await this.enterpriseProfiles.save(ep);
    }
    await this.risk.recomputeEnterprise(enterpriseUserId);
    await this.maybeCompleteJob(s.jobId);
    return s;
  }

  private async maybeCompleteJob(jobId: number) {
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) return;
    const tasks = await this.tasks.find({ where: { jobId } });
    const allDone =
      tasks.length > 0 &&
      tasks.every((t) => [TaskStatus.SETTLED, TaskStatus.CANCELLED].includes(t.status));
    if (allDone && [TaskStatus.SETTLED, TaskStatus.CANCELLED].length > 0) {
      job.status = job.status === JobStatus.CANCELLED ? JobStatus.CANCELLED : JobStatus.COMPLETED;
      await this.jobs.save(job);
      // 退回剩余冻结保证金
      const spent = await this.settlements
        .createQueryBuilder('s')
        .select('COALESCE(SUM(s.grossAmount + s.platformFee), 0)', 'total')
        .where('s.jobId = :jobId', { jobId })
        .getRawOne();
      const remaining = round2(Number(job.depositFrozen) - Number(spent?.total || 0));
      if (remaining > 0) {
        await this.wallet.unfreeze(job.enterpriseId, remaining, jobId, '岗位完结退回剩余保证金');
      }
    }
  }
}
