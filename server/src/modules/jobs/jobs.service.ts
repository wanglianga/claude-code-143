import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobCategory, JobStatus } from '../../entities/job.entity';
import { Application, ApplicationStatus } from '../../entities/application.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { TaskEvent, TaskEventType } from '../../entities/task-event.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { WalletService } from '../wallet/wallet.service';
import { WalletTxType } from '../../entities/wallet-transaction.entity';
import { RiskService } from '../risk/risk.service';
import { hoursBetween, round2 } from '../../common/utils';
import { CANCEL_COMPENSATION_RATE } from '../../common/constants';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job) private jobs: Repository<Job>,
    @InjectRepository(Application) private applications: Repository<Application>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(TaskEvent) private events: Repository<TaskEvent>,
    @InjectRepository(WorkerProfile) private workerProfiles: Repository<WorkerProfile>,
    private wallet: WalletService,
    private risk: RiskService,
  ) {}

  /** 预估单人成本：工时*时薪 + 餐补 + 20% 加班缓冲 */
  estimatePerWorker(job: Partial<Job>): number {
    const hours = Math.max(
      1,
      hoursBetween(new Date(job.startTime), new Date(job.endTime)),
    );
    return round2(
      hours * Number(job.hourlyWage) * 1.2 + Number(job.mealAllowance || 0),
    );
  }

  /** 发单需冻结保证金 = 单人预估成本 * 人数 * 企业风险倍率 */
  async depositPreview(enterpriseUserId: number, dto: Partial<Job>) {
    const profile = await this.wallet.getProfile(enterpriseUserId);
    const perWorker = this.estimatePerWorker(dto);
    const multiplier = Number(profile.depositMultiplier) || 1;
    const amount = round2(perWorker * (dto.headcount || 1) * multiplier);
    return {
      perWorkerEstimate: perWorker,
      headcount: dto.headcount || 1,
      multiplier,
      riskLevel: profile.riskLevel,
      strictConfirm: profile.strictConfirm,
      requiredDeposit: amount,
      availableBalance: Number(profile.depositBalance),
    };
  }

  async create(enterpriseUserId: number, dto: Partial<Job>) {
    const job = this.jobs.create({
      ...dto,
      enterpriseId: enterpriseUserId,
      status: JobStatus.DRAFT,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
    });
    return this.jobs.save(job);
  }

  async update(enterpriseUserId: number, id: number, dto: Partial<Job>) {
    const job = await this.getOwned(enterpriseUserId, id);
    if (job.status !== JobStatus.DRAFT) {
      throw new BadRequestException('仅草稿状态的岗位可编辑');
    }
    Object.assign(job, dto, {
      startTime: new Date(dto.startTime ?? job.startTime),
      endTime: new Date(dto.endTime ?? job.endTime),
    });
    return this.jobs.save(job);
  }

  async publish(enterpriseUserId: number, id: number) {
    const job = await this.getOwned(enterpriseUserId, id);
    if (job.status !== JobStatus.DRAFT) {
      throw new BadRequestException('岗位已发布或已关闭');
    }
    if (new Date(job.startTime) <= new Date()) {
      throw new BadRequestException('开始时间必须晚于当前时间');
    }
    const preview = await this.depositPreview(enterpriseUserId, job);
    await this.wallet.freeze(
      enterpriseUserId,
      preview.requiredDeposit,
      job.id,
      `发单冻结（${job.title}）`,
    );
    job.depositFrozen = preview.requiredDeposit;
    job.status = JobStatus.PUBLISHED;
    job.publishedAt = new Date();
    await this.jobs.save(job);
    await this.risk.recomputeEnterprise(enterpriseUserId);
    return job;
  }

  async cancel(enterpriseUserId: number, id: number, reason: string) {
    const job = await this.getOwned(enterpriseUserId, id);
    if (![JobStatus.PUBLISHED, JobStatus.CLOSED].includes(job.status)) {
      throw new BadRequestException('当前状态不可取消');
    }
    job.status = JobStatus.CANCELLED;
    job.cancelledAt = new Date();
    job.cancelReason = reason || '企业取消';
    await this.jobs.save(job);

    // 对已录用且未结算的工人发放补偿（从冻结保证金支出）
    const perWorker = this.estimatePerWorker(job);
    const compensation = round2(perWorker * CANCEL_COMPENSATION_RATE);
    const tasks = await this.tasks.find({
      where: { jobId: job.id },
    });
    let compensated = 0;
    for (const task of tasks) {
      if ([TaskStatus.SETTLED, TaskStatus.CANCELLED].includes(task.status)) continue;
      task.status = TaskStatus.CANCELLED;
      await this.tasks.save(task);
      await this.events.save(
        this.events.create({
          taskId: task.id,
          type: TaskEventType.JOB_CANCELLED,
          payload: { reason: job.cancelReason, compensation },
          reportedBy: enterpriseUserId,
          reportedByRole: 'enterprise',
        }),
      );
      if (compensation > 0) {
        await this.wallet.spend(
          enterpriseUserId,
          compensation,
          WalletTxType.COMPENSATION,
          `取消岗位补偿（${job.title}）`,
          job.id,
          task.id,
        );
        const wp = await this.workerProfiles.findOne({ where: { userId: task.workerId } });
        if (wp) {
          wp.balance = round2(Number(wp.balance) + compensation);
          await this.workerProfiles.save(wp);
        }
        compensated += compensation;
      }
    }
    // 退回剩余冻结保证金
    const remaining = round2(Number(job.depositFrozen) - compensated);
    if (remaining > 0) {
      await this.wallet.unfreeze(enterpriseUserId, remaining, job.id, '取消岗位退回保证金');
    }
    await this.risk.recomputeEnterprise(enterpriseUserId);
    return { job, compensatedWorkers: tasks.length, compensation };
  }

  async listPublic(query: { category?: JobCategory; keyword?: string }) {
    const qb = this.jobs
      .createQueryBuilder('j')
      .where('j.status = :status', { status: JobStatus.PUBLISHED })
      .orderBy('j.startTime', 'ASC');
    if (query.category) qb.andWhere('j.category = :category', { category: query.category });
    if (query.keyword) qb.andWhere('j.title LIKE :kw', { kw: `%${query.keyword}%` });
    const jobs = await qb.getMany();
    return jobs.map((j) => ({
      ...j,
      remaining: Math.max(0, j.headcount - j.approvedCount),
    }));
  }

  async listMine(enterpriseUserId: number) {
    return this.jobs.find({
      where: { enterpriseId: enterpriseUserId },
      order: { createdAt: 'DESC' },
    });
  }

  async detail(id: number) {
    const job = await this.jobs.findOne({ where: { id } });
    if (!job) throw new NotFoundException('岗位不存在');
    return { ...job, remaining: Math.max(0, job.headcount - job.approvedCount) };
  }

  async getOwned(enterpriseUserId: number, id: number): Promise<Job> {
    const job = await this.jobs.findOne({ where: { id } });
    if (!job) throw new NotFoundException('岗位不存在');
    if (job.enterpriseId !== enterpriseUserId) throw new ForbiddenException('无权操作该岗位');
    return job;
  }

  /** 录用人数满员后自动关闭报名 */
  async maybeClose(jobId: number) {
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (job && job.status === JobStatus.PUBLISHED && job.approvedCount >= job.headcount) {
      job.status = JobStatus.CLOSED;
      await this.jobs.save(job);
    }
  }

  categories() {
    return Object.values(JobCategory);
  }
}
