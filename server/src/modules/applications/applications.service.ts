import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, ApplicationStatus } from '../../entities/application.entity';
import { Job, JobStatus } from '../../entities/job.entity';
import { Task } from '../../entities/task.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { User } from '../../entities/user.entity';
import { JobsService } from '../jobs/jobs.service';
import { randomCode } from '../../common/utils';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application) private applications: Repository<Application>,
    @InjectRepository(Job) private jobs: Repository<Job>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(WorkerProfile) private workerProfiles: Repository<WorkerProfile>,
    @InjectRepository(User) private users: Repository<User>,
    private jobsService: JobsService,
  ) {}

  /** 工人报名：需完成实名、签署风险告知书、满足健康证要求 */
  async apply(workerUserId: number, jobId: number) {
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job || job.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException('岗位不存在或已停止报名');
    }
    if (job.approvedCount >= job.headcount) throw new BadRequestException('岗位已招满');

    const profile = await this.workerProfiles.findOne({ where: { userId: workerUserId } });
    if (!profile || !profile.realNameVerified) {
      throw new BadRequestException('请先在「我的档案」完成实名认证');
    }
    if (!profile.riskNoticeSignedAt) {
      throw new BadRequestException('请先签署《临时用工风险告知书》');
    }
    if (job.healthCertRequired) {
      if (!profile.healthCertNo) throw new BadRequestException('该岗位要求有效健康证，请先完善资质');
      if (profile.healthCertExpiry && new Date(profile.healthCertExpiry) < new Date()) {
        throw new BadRequestException('健康证已过期，请更新后再报名');
      }
    }
    const exists = await this.applications.findOne({
      where: { jobId, workerId: workerUserId },
    });
    if (exists && exists.status !== ApplicationStatus.CANCELLED && exists.status !== ApplicationStatus.REJECTED) {
      throw new BadRequestException('已报名过该岗位');
    }
    if (exists) {
      exists.status = ApplicationStatus.PENDING;
      exists.appliedAt = new Date();
      return this.applications.save(exists);
    }
    return this.applications.save(
      this.applications.create({ jobId, workerId: workerUserId }),
    );
  }

  async myApplications(workerUserId: number) {
    const apps = await this.applications.find({
      where: { workerId: workerUserId },
      order: { appliedAt: 'DESC' },
    });
    const result = [];
    for (const a of apps) {
      const job = await this.jobs.findOne({ where: { id: a.jobId } });
      result.push({ ...a, job });
    }
    return result;
  }

  async jobApplications(enterpriseUserId: number, jobId: number) {
    await this.jobsService.getOwned(enterpriseUserId, jobId);
    const apps = await this.applications.find({
      where: { jobId },
      order: { appliedAt: 'ASC' },
    });
    const result = [];
    for (const a of apps) {
      const user = await this.users.findOne({ where: { id: a.workerId } });
      const profile = await this.workerProfiles.findOne({ where: { userId: a.workerId } });
      result.push({
        ...a,
        worker: user ? { id: user.id, name: user.name, phone: user.phone } : null,
        workerProfile: profile
          ? {
              realNameVerified: profile.realNameVerified,
              healthCertNo: profile.healthCertNo,
              healthCertExpiry: profile.healthCertExpiry,
              skills: profile.skills,
              ratingAvg: profile.ratingAvg,
              ratingCount: profile.ratingCount,
              totalJobs: profile.totalJobs,
              riskNoticeSignedAt: profile.riskNoticeSignedAt,
            }
          : null,
      });
    }
    return result;
  }

  /** 企业录用：生成派单任务（含签到二维码） */
  async approve(enterpriseUserId: number, applicationId: number) {
    const app = await this.applications.findOne({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('报名记录不存在');
    const job = await this.jobsService.getOwned(enterpriseUserId, app.jobId);
    if (app.status !== ApplicationStatus.PENDING) throw new BadRequestException('该报名已处理');
    if (job.approvedCount >= job.headcount) throw new BadRequestException('岗位已招满');

    app.status = ApplicationStatus.APPROVED;
    app.decidedAt = new Date();
    await this.applications.save(app);

    const task = await this.tasks.save(
      this.tasks.create({
        jobId: job.id,
        workerId: app.workerId,
        enterpriseId: enterpriseUserId,
        applicationId: app.id,
        qrCode: randomCode(8),
      }),
    );
    job.approvedCount += 1;
    await this.jobs.save(job);
    await this.jobsService.maybeClose(job.id);
    return { application: app, task };
  }

  async reject(enterpriseUserId: number, applicationId: number, reason: string) {
    const app = await this.applications.findOne({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('报名记录不存在');
    await this.jobsService.getOwned(enterpriseUserId, app.jobId);
    if (app.status !== ApplicationStatus.PENDING) throw new BadRequestException('该报名已处理');
    app.status = ApplicationStatus.REJECTED;
    app.rejectReason = reason || '不符合岗位要求';
    app.decidedAt = new Date();
    return this.applications.save(app);
  }

  async cancelByWorker(workerUserId: number, applicationId: number) {
    const app = await this.applications.findOne({ where: { id: applicationId } });
    if (!app || app.workerId !== workerUserId) throw new NotFoundException('报名记录不存在');
    if (app.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('仅待审核的报名可取消（已录用请联系企业）');
    }
    app.status = ApplicationStatus.CANCELLED;
    return this.applications.save(app);
  }
}
