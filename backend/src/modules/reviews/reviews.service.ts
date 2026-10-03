import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, Assignment, Job } from '../../entities';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(Assignment) private assignments: Repository<Assignment>,
    @InjectRepository(Job) private jobs: Repository<Job>,
  ) {}

  /** 完工后双向评价（每人对对方一次） */
  async create(user: { sub: number; role: string; enterpriseId?: number | null }, assignmentId: number, rating: number, comment?: string) {
    const a = await this.assignments.findOne({ where: { id: assignmentId } });
    if (!a) throw new NotFoundException('派单不存在');
    const job = await this.jobs.findOne({ where: { id: a.jobId } });
    if (!['COMPLETED', 'LEFT_EARLY'].includes(a.status)) {
      throw new BadRequestException('任务完工后才能评价');
    }
    if (rating < 1 || rating > 5) throw new BadRequestException('评分需在 1-5 之间');

    let reviewerRole: string;
    let targetId: number;
    let targetRole: string;
    if (user.role === 'WORKER' && user.sub === a.workerId) {
      reviewerRole = 'WORKER';
      targetId = job.enterpriseId;
      targetRole = 'ENTERPRISE';
    } else if ((user.role === 'ENTERPRISE' || user.role === 'SUPERVISOR') && user.enterpriseId === job.enterpriseId) {
      reviewerRole = 'ENTERPRISE';
      targetId = a.workerId;
      targetRole = 'WORKER';
    } else {
      throw new ForbiddenException('只有任务双方可以互评');
    }

    const exists = await this.reviews.findOne({
      where: { assignmentId, reviewerId: user.sub, targetId },
    });
    if (exists) throw new BadRequestException('您已评价过该任务');

    return this.reviews.save(this.reviews.create({
      assignmentId,
      jobId: job.id,
      reviewerId: user.sub,
      reviewerRole,
      targetId,
      targetRole,
      rating,
      comment: comment || null,
    }));
  }

  async listForTarget(targetRole: string, targetId: number) {
    return this.reviews.find({ where: { targetRole, targetId }, order: { id: 'DESC' }, take: 50 });
  }
}
