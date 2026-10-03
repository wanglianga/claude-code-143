import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { Job } from '../../entities/job.entity';
import { Attendance } from '../../entities/attendance.entity';
import { InsurancePolicy } from '../../entities/insurance-policy.entity';
import { TaskEvent, TaskEventType } from '../../entities/task-event.entity';
import { Settlement } from '../../entities/settlement.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { Review } from '../../entities/review.entity';
import { User, UserRole } from '../../entities/user.entity';
import { AuthUser } from '../../common/current-user.decorator';

/** 各角色可上报的事件类型 */
const EVENT_ROLE_RULES: Record<TaskEventType, UserRole[]> = {
  [TaskEventType.OVERTIME]: [UserRole.ENTERPRISE, UserRole.SUPERVISOR],
  [TaskEventType.POSITION_SWAP]: [UserRole.ENTERPRISE, UserRole.SUPERVISOR],
  [TaskEventType.EARLY_LEAVE]: [UserRole.WORKER, UserRole.ENTERPRISE, UserRole.SUPERVISOR],
  [TaskEventType.EXTRA_WORK]: [UserRole.ENTERPRISE, UserRole.SUPERVISOR],
  [TaskEventType.INJURY]: [UserRole.WORKER, UserRole.ENTERPRISE, UserRole.SUPERVISOR],
  [TaskEventType.JOB_CANCELLED]: [UserRole.ENTERPRISE],
  [TaskEventType.DEDUCTION]: [UserRole.ENTERPRISE],
  [TaskEventType.NOTE]: [UserRole.WORKER, UserRole.ENTERPRISE, UserRole.SUPERVISOR],
};

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Job) private jobs: Repository<Job>,
    @InjectRepository(Attendance) private attendances: Repository<Attendance>,
    @InjectRepository(InsurancePolicy) private policies: Repository<InsurancePolicy>,
    @InjectRepository(TaskEvent) private events: Repository<TaskEvent>,
    @InjectRepository(Settlement) private settlements: Repository<Settlement>,
    @InjectRepository(ChatMessage) private chats: Repository<ChatMessage>,
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  /** 访问控制：任务相关方（工人本人/所属企业/企业主管/平台客服） */
  async assertAccess(user: AuthUser, task: Task) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.WORKER && task.workerId === user.id) return;
    if (user.role === UserRole.ENTERPRISE && task.enterpriseId === user.id) return;
    if (user.role === UserRole.SUPERVISOR && user.enterpriseId === task.enterpriseId) return;
    throw new ForbiddenException('无权查看该任务');
  }

  async getTask(id: number): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id } });
    if (!task) throw new NotFoundException('任务不存在');
    return task;
  }

  async myTasks(workerUserId: number) {
    const tasks = await this.tasks.find({
      where: { workerId: workerUserId },
      order: { createdAt: 'DESC' },
    });
    return this.withJobInfo(tasks);
  }

  async jobTasks(user: AuthUser, jobId: number) {
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('岗位不存在');
    if (user.role === UserRole.ENTERPRISE && job.enterpriseId !== user.id)
      throw new ForbiddenException('无权查看');
    if (user.role === UserRole.SUPERVISOR && job.enterpriseId !== user.enterpriseId)
      throw new ForbiddenException('无权查看');
    const tasks = await this.tasks.find({ where: { jobId }, order: { createdAt: 'ASC' } });
    return this.withJobInfo(tasks);
  }

  /** 主管名下任务（本企业全部进行中任务） */
  async supervisorTasks(user: AuthUser) {
    const tasks = await this.tasks.find({
      where: { enterpriseId: user.enterpriseId },
      order: { createdAt: 'DESC' },
    });
    return this.withJobInfo(tasks);
  }

  private async withJobInfo(tasks: Task[]) {
    const result = [];
    for (const t of tasks) {
      const job = await this.jobs.findOne({ where: { id: t.jobId } });
      const worker = await this.users.findOne({ where: { id: t.workerId } });
      const attendance = await this.attendances.findOne({ where: { taskId: t.id } });
      const settlement = await this.settlements.findOne({ where: { taskId: t.id } });
      result.push({
        ...t,
        job,
        worker: worker ? { id: worker.id, name: worker.name, phone: worker.phone } : null,
        attendanceStatus: attendance?.status ?? null,
        settlementStatus: settlement?.status ?? null,
      });
    }
    return result;
  }

  /** 任务全量详情：派单+考勤+保险+事件+结算+评价+聊天 同一视图 */
  async detail(user: AuthUser, taskId: number) {
    const task = await this.getTask(taskId);
    await this.assertAccess(user, task);
    const [job, attendance, insurance, events, settlement, chats, reviews, worker, enterprise] =
      await Promise.all([
        this.jobs.findOne({ where: { id: task.jobId } }),
        this.attendances.findOne({ where: { taskId } }),
        this.policies.findOne({ where: { taskId } }),
        this.events.find({ where: { taskId }, order: { createdAt: 'ASC' } }),
        this.settlements.findOne({ where: { taskId } }),
        this.chats.find({ where: { taskId }, order: { createdAt: 'ASC' }, take: 200 }),
        this.reviews.find({ where: { taskId } }),
        this.users.findOne({ where: { id: task.workerId } }),
        this.users.findOne({ where: { id: task.enterpriseId } }),
      ]);
    return {
      task,
      job,
      attendance,
      insurance,
      events,
      settlement,
      chats,
      reviews,
      worker: worker ? { id: worker.id, name: worker.name, phone: worker.phone } : null,
      enterprise: enterprise ? { id: enterprise.id, name: enterprise.name } : null,
    };
  }

  /** 上报任务事件（加班/调岗/早退/额外工作/受伤/扣款/备注） */
  async addEvent(
    user: AuthUser,
    taskId: number,
    type: TaskEventType,
    payload: Record<string, any>,
  ) {
    const task = await this.getTask(taskId);
    await this.assertAccess(user, task);
    const allowed = EVENT_ROLE_RULES[type];
    if (!allowed) throw new BadRequestException('不支持的事件类型');
    if (!allowed.includes(user.role as UserRole)) {
      throw new ForbiddenException(`当前角色无权上报「${type}」事件`);
    }
    if (type === TaskEventType.DEDUCTION) {
      const amount = Number(payload?.amount || 0);
      if (amount <= 0) throw new BadRequestException('扣款金额需大于 0');
      if (!payload?.reason) throw new BadRequestException('请填写扣款原因');
    }
    if (type === TaskEventType.OVERTIME) {
      const hours = Number(payload?.hours || 0);
      if (hours <= 0 || hours > 12) throw new BadRequestException('加班时长需在 0-12 小时之间');
    }
    const event = await this.events.save(
      this.events.create({
        taskId,
        type,
        payload: payload || {},
        reportedBy: user.id,
        reportedByRole: user.role,
      }),
    );
    return event;
  }

  async addChat(user: AuthUser, taskId: number, content: string) {
    const task = await this.getTask(taskId);
    await this.assertAccess(user, task);
    if (!content || !content.trim()) throw new BadRequestException('消息不能为空');
    return this.chats.save(
      this.chats.create({
        taskId,
        senderId: user.id,
        senderRole: user.role,
        senderName: user.name,
        content: content.trim().slice(0, 1000),
      }),
    );
  }
}
