import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { round2 } from '../../common/utils';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(WorkerProfile) private workerProfiles: Repository<WorkerProfile>,
  ) {}

  /** 任务结算后双方互评 */
  async create(user: AuthUser, taskId: number, rating: number, comment: string) {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    if (task.status !== TaskStatus.SETTLED) {
      throw new BadRequestException('任务结算完成后才能评价');
    }
    let toUserId: number;
    if (user.role === UserRole.WORKER && task.workerId === user.id) {
      toUserId = task.enterpriseId;
    } else if (user.role === UserRole.ENTERPRISE && task.enterpriseId === user.id) {
      toUserId = task.workerId;
    } else {
      throw new BadRequestException('仅任务双方可评价');
    }
    if (!rating || rating < 1 || rating > 5) throw new BadRequestException('评分需为 1-5 星');
    const exists = await this.reviews.findOne({ where: { taskId, fromUserId: user.id } });
    if (exists) throw new BadRequestException('已评价过该任务');

    const review = await this.reviews.save(
      this.reviews.create({
        taskId,
        fromUserId: user.id,
        toUserId,
        rating,
        comment: (comment || '').slice(0, 500),
      }),
    );
    // 更新工人评分
    const workerReviews = await this.reviews.find({ where: { toUserId } });
    const wp = await this.workerProfiles.findOne({ where: { userId: toUserId } });
    if (wp && workerReviews.length > 0) {
      const sum = workerReviews.reduce((s, r) => s + r.rating, 0);
      wp.ratingAvg = round2(sum / workerReviews.length);
      wp.ratingCount = workerReviews.length;
      await this.workerProfiles.save(wp);
    }
    return review;
  }

  async forUser(userId: number) {
    return this.reviews.find({ where: { toUserId: userId }, order: { createdAt: 'DESC' } });
  }
}
