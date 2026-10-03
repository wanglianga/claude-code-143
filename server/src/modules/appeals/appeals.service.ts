import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appeal, AppealStatus } from '../../entities/appeal.entity';
import { Settlement, SettlementStatus } from '../../entities/settlement.entity';
import { Task } from '../../entities/task.entity';
import { Job } from '../../entities/job.entity';
import { Attendance } from '../../entities/attendance.entity';
import { TaskEvent } from '../../entities/task-event.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { InsurancePolicy } from '../../entities/insurance-policy.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';
import { User } from '../../entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { WalletTxType } from '../../entities/wallet-transaction.entity';
import { RiskService } from '../risk/risk.service';
import { round2 } from '../../common/utils';

/**
 * 申诉与仲裁：
 * 工人对结算（扣款等）发起申诉 → 客服查看签到轨迹、主管确认、现场照片、聊天记录取证 →
 * 决定补发 / 维持扣款 / 升级仲裁。处理结果联动结算支付与企业争议率。
 */
@Injectable()
export class AppealsService {
  constructor(
    @InjectRepository(Appeal) private appeals: Repository<Appeal>,
    @InjectRepository(Settlement) private settlements: Repository<Settlement>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Job) private jobs: Repository<Job>,
    @InjectRepository(Attendance) private attendances: Repository<Attendance>,
    @InjectRepository(TaskEvent) private events: Repository<TaskEvent>,
    @InjectRepository(ChatMessage) private chats: Repository<ChatMessage>,
    @InjectRepository(InsurancePolicy) private policies: Repository<InsurancePolicy>,
    @InjectRepository(WorkerProfile) private workerProfiles: Repository<WorkerProfile>,
    @InjectRepository(EnterpriseProfile) private enterpriseProfiles: Repository<EnterpriseProfile>,
    @InjectRepository(User) private users: Repository<User>,
    private wallet: WalletService,
    private risk: RiskService,
  ) {}

  /** 工人发起申诉 */
  async file(workerUserId: number, settlementId: number, reason: string, evidence: string[]) {
    const s = await this.settlements.findOne({ where: { id: settlementId } });
    if (!s || s.workerId !== workerUserId) throw new NotFoundException('结算单不存在');
    if (s.status === SettlementStatus.APPEALED) throw new BadRequestException('已申诉，请等待处理');
    if (!reason || reason.trim().length < 5) throw new BadRequestException('请填写申诉原因（至少 5 字）');

    const appeal = await this.appeals.save(
      this.appeals.create({
        settlementId: s.id,
        taskId: s.taskId,
        workerId: workerUserId,
        enterpriseId: s.enterpriseId,
        reason: reason.trim(),
        evidence: evidence || [],
        status: AppealStatus.OPEN,
      }),
    );
    s.status = SettlementStatus.APPEALED;
    await this.settlements.save(s);

    // 企业争议率沉淀
    const ep = await this.enterpriseProfiles.findOne({ where: { userId: s.enterpriseId } });
    if (ep) {
      ep.disputedJobs += 1;
      await this.enterpriseProfiles.save(ep);
    }
    await this.risk.recomputeEnterprise(s.enterpriseId);
    return appeal;
  }

  async myAppeals(workerUserId: number) {
    const list = await this.appeals.find({
      where: { workerId: workerUserId },
      order: { createdAt: 'DESC' },
    });
    return this.withMeta(list);
  }

  async listAll(status?: AppealStatus) {
    const list = await this.appeals.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
    return this.withMeta(list);
  }

  private async withMeta(list: Appeal[]) {
    const result = [];
    for (const a of list) {
      const [settlement, worker, enterprise] = await Promise.all([
        this.settlements.findOne({ where: { id: a.settlementId } }),
        this.users.findOne({ where: { id: a.workerId } }),
        this.users.findOne({ where: { id: a.enterpriseId } }),
      ]);
      const job = settlement ? await this.jobs.findOne({ where: { id: settlement.jobId } }) : null;
      result.push({
        ...a,
        settlement,
        jobTitle: job?.title,
        workerName: worker?.name,
        enterpriseName: enterprise?.name,
      });
    }
    return result;
  }

  /** 客服取证视图：签到轨迹、主管确认、现场照片、聊天记录、事件、保单 */
  async evidence(appealId: number) {
    const appeal = await this.appeals.findOne({ where: { id: appealId } });
    if (!appeal) throw new NotFoundException('申诉不存在');
    const [settlement, attendance, events, chats, policy, task, job] = await Promise.all([
      this.settlements.findOne({ where: { id: appeal.settlementId } }),
      this.attendances.findOne({ where: { taskId: appeal.taskId } }),
      this.events.find({ where: { taskId: appeal.taskId }, order: { createdAt: 'ASC' } }),
      this.chats.find({ where: { taskId: appeal.taskId }, order: { createdAt: 'ASC' } }),
      this.policies.findOne({ where: { taskId: appeal.taskId } }),
      this.tasks.findOne({ where: { id: appeal.taskId } }),
      this.jobs.findOne({ where: { id: (await this.settlements.findOne({ where: { id: appeal.settlementId } }))?.jobId } }),
    ]);
    const supervisor = attendance?.supervisorConfirmedBy
      ? await this.users.findOne({ where: { id: attendance.supervisorConfirmedBy } })
      : null;
    return {
      appeal,
      settlement,
      task,
      job,
      attendance,
      supervisorName: supervisor?.name || null,
      events,
      chats,
      policy,
    };
  }

  /** 客服裁决：补发 / 维持扣款 / 升级仲裁 / 仲裁结案 */
  async resolve(
    handlerId: number,
    appealId: number,
    action: 'reissue' | 'maintain' | 'escalate',
    note: string,
    reissueAmount?: number,
  ) {
    const appeal = await this.appeals.findOne({ where: { id: appealId } });
    if (!appeal) throw new NotFoundException('申诉不存在');
    if ([AppealStatus.RESOLVED_REISSUE, AppealStatus.RESOLVED_MAINTAINED, AppealStatus.ARBITRATED].includes(appeal.status)) {
      throw new BadRequestException('该申诉已结案');
    }
    const settlement = await this.settlements.findOne({ where: { id: appeal.settlementId } });
    if (!settlement) throw new NotFoundException('结算单不存在');
    const wasEscalated = appeal.status === AppealStatus.ESCALATED;

    if (action === 'escalate') {
      appeal.status = AppealStatus.ESCALATED;
      appeal.handlerId = handlerId;
      appeal.resolutionNote = note || '已升级平台仲裁委员会';
      await this.appeals.save(appeal);
      return appeal;
    }

    if (action === 'reissue') {
      const amount = round2(Number(reissueAmount || 0));
      if (amount <= 0) throw new BadRequestException('补发金额需大于 0');
      // 企业保证金补发给工人
      await this.wallet.spend(
        appeal.enterpriseId,
        amount,
        WalletTxType.APPEAL_REISSUE,
        `申诉补发（申诉单 #${appeal.id}）`,
        settlement.jobId,
        appeal.taskId,
      );
      const wp = await this.workerProfiles.findOne({ where: { userId: appeal.workerId } });
      if (wp) {
        wp.balance = round2(Number(wp.balance) + amount);
        await this.workerProfiles.save(wp);
      }
      appeal.reissueAmount = amount;
      appeal.status = wasEscalated ? AppealStatus.ARBITRATED : AppealStatus.RESOLVED_REISSUE;
    } else {
      appeal.status = wasEscalated ? AppealStatus.ARBITRATED : AppealStatus.RESOLVED_MAINTAINED;
    }

    // 若结算尚未支付（申诉冻结中），结案时按原金额完成支付
    if (settlement.status === SettlementStatus.APPEALED) {
      const total = round2(Number(settlement.grossAmount) + Number(settlement.platformFee));
      await this.wallet.spend(
        appeal.enterpriseId,
        total,
        WalletTxType.PAYMENT,
        `申诉结案支付日结工资（结算单 #${settlement.id}）`,
        settlement.jobId,
        settlement.taskId,
      );
      const wp = await this.workerProfiles.findOne({ where: { userId: appeal.workerId } });
      if (wp) {
        wp.balance = round2(Number(wp.balance) + Number(settlement.netAmount));
        wp.totalJobs += 1;
        await this.workerProfiles.save(wp);
      }
      settlement.status = SettlementStatus.CONFIRMED;
      settlement.paidAt = new Date();
      await this.settlements.save(settlement);
      const task = await this.tasks.findOne({ where: { id: settlement.taskId } });
      if (task) {
        task.status = task.status === 'settled' ? task.status : ('settled' as any);
        await this.tasks.save(task);
      }
    }

    appeal.handlerId = handlerId;
    appeal.resolutionNote = note || (action === 'reissue' ? '裁定补发' : '裁定维持原结算');
    appeal.resolvedAt = new Date();
    await this.appeals.save(appeal);
    await this.risk.recomputeEnterprise(appeal.enterpriseId);
    return appeal;
  }
}
