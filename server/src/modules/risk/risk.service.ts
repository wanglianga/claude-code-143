import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EnterpriseProfile,
  EnterpriseRiskLevel,
} from '../../entities/enterprise-profile.entity';
import { Job, JobStatus } from '../../entities/job.entity';
import { TaskEvent, TaskEventType } from '../../entities/task-event.entity';
import { Task } from '../../entities/task.entity';
import { User } from '../../entities/user.entity';
import { round2 } from '../../common/utils';

/**
 * 企业/行业风险沉淀：
 * - 按取消率、争议率动态调整企业风险等级
 * - 高风险企业发单时需缴纳更高保证金倍率，且考勤必须现场主管确认
 * - 行业维度统计岗位风险（工伤、争议、取消）
 */
@Injectable()
export class RiskService {
  constructor(
    @InjectRepository(EnterpriseProfile) private profiles: Repository<EnterpriseProfile>,
    @InjectRepository(Job) private jobs: Repository<Job>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(TaskEvent) private events: Repository<TaskEvent>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  /** 重新计算某企业的风险指标（发单/取消/争议/结算后调用） */
  async recomputeEnterprise(enterpriseUserId: number) {
    const p = await this.profiles.findOne({ where: { userId: enterpriseUserId } });
    if (!p) return null;
    const total = await this.jobs.count({
      where: [
        { enterpriseId: enterpriseUserId, status: JobStatus.PUBLISHED },
        { enterpriseId: enterpriseUserId, status: JobStatus.CLOSED },
        { enterpriseId: enterpriseUserId, status: JobStatus.CANCELLED },
        { enterpriseId: enterpriseUserId, status: JobStatus.COMPLETED },
      ],
    });
    const cancelled = await this.jobs.count({
      where: { enterpriseId: enterpriseUserId, status: JobStatus.CANCELLED },
    });
    p.totalJobs = total;
    p.cancelledJobs = cancelled;
    p.cancelRate = total > 0 ? round2(cancelled / total) : 0;
    const denom = p.settledJobs + p.disputedJobs;
    p.disputeRate = denom > 0 ? round2(p.disputedJobs / denom) : 0;

    if (p.cancelRate >= 0.15 || p.disputeRate >= 0.15) {
      p.riskLevel = EnterpriseRiskLevel.HIGH;
      p.depositMultiplier = 2;
      p.strictConfirm = true;
    } else if (p.cancelRate >= 0.05 || p.disputeRate >= 0.05) {
      p.riskLevel = EnterpriseRiskLevel.MID;
      p.depositMultiplier = 1.5;
      p.strictConfirm = false;
    } else {
      p.riskLevel = EnterpriseRiskLevel.LOW;
      p.depositMultiplier = 1;
      p.strictConfirm = false;
    }
    return this.profiles.save(p);
  }

  async listEnterprises() {
    const profiles = await this.profiles.find({ order: { disputeRate: 'DESC' } });
    const result = [];
    for (const p of profiles) {
      const user = await this.users.findOne({ where: { id: p.userId } });
      result.push({ ...p, phone: user?.phone, accountName: user?.name });
    }
    return result;
  }

  /** 行业岗位风险沉淀 */
  async industryStats() {
    const jobs = await this.jobs.find();
    const tasks = await this.tasks.find();
    const events = await this.events.find();
    const taskJob = new Map(tasks.map((t) => [t.id, t.jobId]));
    const jobCategory = new Map(jobs.map((j) => [j.id, j.category]));

    const stats: Record<
      string,
      {
        category: string;
        jobCount: number;
        cancelledJobs: number;
        taskCount: number;
        injuryCount: number;
        disputeEvents: number;
        avgHourlyWage: number;
        riskScore: number;
        riskLevel: string;
      }
    > = {};
    for (const j of jobs) {
      const s =
        stats[j.category] ||
        (stats[j.category] = {
          category: j.category,
          jobCount: 0,
          cancelledJobs: 0,
          taskCount: 0,
          injuryCount: 0,
          disputeEvents: 0,
          avgHourlyWage: 0,
          riskScore: 0,
          riskLevel: 'low',
        });
      s.jobCount += 1;
      if (j.status === JobStatus.CANCELLED) s.cancelledJobs += 1;
      s.avgHourlyWage += Number(j.hourlyWage);
    }
    for (const t of tasks) {
      const cat = jobCategory.get(t.jobId);
      if (cat && stats[cat]) stats[cat].taskCount += 1;
    }
    for (const e of events) {
      const jobId = taskJob.get(e.taskId);
      const cat = jobId ? jobCategory.get(jobId) : undefined;
      if (!cat || !stats[cat]) continue;
      if (e.type === TaskEventType.INJURY) stats[cat].injuryCount += 1;
      if (e.type === TaskEventType.DEDUCTION) stats[cat].disputeEvents += 1;
    }
    for (const cat of Object.keys(stats)) {
      const s = stats[cat];
      s.avgHourlyWage = s.jobCount > 0 ? round2(s.avgHourlyWage / s.jobCount) : 0;
      const cancelRate = s.jobCount > 0 ? s.cancelledJobs / s.jobCount : 0;
      const injuryRate = s.taskCount > 0 ? s.injuryCount / s.taskCount : 0;
      const disputeRate = s.taskCount > 0 ? s.disputeEvents / s.taskCount : 0;
      s.riskScore = round2(cancelRate * 40 + injuryRate * 40 + disputeRate * 20);
      s.riskLevel = s.riskScore >= 12 ? 'high' : s.riskScore >= 5 ? 'mid' : 'low';
    }
    return Object.values(stats).sort((a, b) => b.riskScore - a.riskScore);
  }
}
