import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InsurancePolicy, InsuranceStatus } from '../../entities/insurance-policy.entity';
import { Task } from '../../entities/task.entity';
import { Job } from '../../entities/job.entity';
import { TaskEvent, TaskEventType } from '../../entities/task-event.entity';
import { INSURANCE_PLANS } from '../../common/constants';
import { randomCode } from '../../common/utils';

/**
 * 保险规则：
 * 1. 保单在实际到岗确认（人脸+定位+二维码+主管确认完成）时签发，生效时间 = 确认时间；
 * 2. 高风险岗位/高风险企业必须主管现场确认后才生效；
 * 3. 已上报受伤事件的任务禁止补录保单（防止事后补保险）；
 * 4. 理赔以保单生效时间之后发生的受伤事件为前提。
 */
@Injectable()
export class InsuranceService {
  constructor(
    @InjectRepository(InsurancePolicy) private policies: Repository<InsurancePolicy>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Job) private jobs: Repository<Job>,
    @InjectRepository(TaskEvent) private events: Repository<TaskEvent>,
  ) {}

  /** 到岗确认后签发保单（幂等） */
  async issueForTask(taskId: number, effectiveAt: Date): Promise<InsurancePolicy> {
    const existing = await this.policies.findOne({ where: { taskId } });
    if (existing) return existing;

    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    const job = await this.jobs.findOne({ where: { id: task.jobId } });
    if (!job) throw new NotFoundException('岗位不存在');

    // 防补录：任务已存在受伤事件则拒绝签发
    const injury = await this.events.findOne({
      where: { taskId, type: TaskEventType.INJURY },
    });
    if (injury) {
      throw new BadRequestException(
        '该任务已上报受伤事件，保险不允许事后补录，请走争议/仲裁流程',
      );
    }

    const plan = INSURANCE_PLANS[job.insurancePlan] || INSURANCE_PLANS.standard;
    const expiresAt = new Date(job.endTime);
    expiresAt.setHours(expiresAt.getHours() + 4);

    const policy = this.policies.create({
      taskId,
      workerId: task.workerId,
      jobId: task.jobId,
      policyNo: `INS${Date.now()}${randomCode(4)}`,
      plan: job.insurancePlan,
      premium: plan.premium,
      coverageAmount: plan.coverage,
      effectiveAt,
      expiresAt,
      status: InsuranceStatus.ACTIVE,
    });
    return this.policies.save(policy);
  }

  async byTask(taskId: number) {
    return this.policies.findOne({ where: { taskId } });
  }

  async myPolicies(workerUserId: number) {
    const policies = await this.policies.find({
      where: { workerId: workerUserId },
      order: { createdAt: 'DESC' },
    });
    const result = [];
    for (const p of policies) {
      const job = await this.jobs.findOne({ where: { id: p.jobId } });
      result.push({ ...p, jobTitle: job?.title });
    }
    return result;
  }

  /** 受伤理赔：需存在保单生效后上报的受伤事件 */
  async claim(workerUserId: number, policyId: number, description: string) {
    const policy = await this.policies.findOne({ where: { id: policyId } });
    if (!policy || policy.workerId !== workerUserId) throw new NotFoundException('保单不存在');
    if (policy.status !== InsuranceStatus.ACTIVE) {
      throw new BadRequestException('保单当前状态不可理赔');
    }
    const injury = await this.events.findOne({
      where: { taskId: policy.taskId, type: TaskEventType.INJURY },
    });
    if (!injury) {
      throw new BadRequestException('请先在任务中上报受伤事件，再申请理赔');
    }
    if (new Date(injury.createdAt) < new Date(policy.effectiveAt)) {
      throw new BadRequestException('受伤事件发生在保单生效前，不在保障范围内');
    }
    policy.status = InsuranceStatus.PAID_OUT;
    policy.claimDescription = description || '工作期间受伤理赔';
    policy.claimAmount = policy.coverageAmount;
    policy.claimedAt = new Date();
    return this.policies.save(policy);
  }
}
