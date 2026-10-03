import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../entities/user.entity';
import { WorkerProfile } from '../entities/worker-profile.entity';
import { EnterpriseProfile } from '../entities/enterprise-profile.entity';
import { Job, JobCategory, JobRiskLevel, JobStatus } from '../entities/job.entity';
import { Application, ApplicationStatus } from '../entities/application.entity';
import { Task, TaskStatus } from '../entities/task.entity';
import { Attendance, AttendanceStatus } from '../entities/attendance.entity';
import { InsurancePolicy, InsuranceStatus } from '../entities/insurance-policy.entity';
import { Settlement, SettlementStatus } from '../entities/settlement.entity';
import { Appeal, AppealStatus } from '../entities/appeal.entity';
import { Review } from '../entities/review.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { TaskEvent, TaskEventType } from '../entities/task-event.entity';
import { RiskService } from '../modules/risk/risk.service';
import { randomCode, round2 } from '../common/utils';
import { INSURANCE_PLANS } from '../common/constants';

/**
 * 演示种子数据：四类角色账号、岗位、历史完工/取消/争议记录。
 * 仅当数据库为空（无 admin）时执行。
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private logger = new Logger('Seed');

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(WorkerProfile) private workerProfiles: Repository<WorkerProfile>,
    @InjectRepository(EnterpriseProfile) private enterpriseProfiles: Repository<EnterpriseProfile>,
    @InjectRepository(Job) private jobs: Repository<Job>,
    @InjectRepository(Application) private applications: Repository<Application>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Attendance) private attendances: Repository<Attendance>,
    @InjectRepository(InsurancePolicy) private policies: Repository<InsurancePolicy>,
    @InjectRepository(Settlement) private settlements: Repository<Settlement>,
    @InjectRepository(Appeal) private appeals: Repository<Appeal>,
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(ChatMessage) private chats: Repository<ChatMessage>,
    @InjectRepository(TaskEvent) private events: Repository<TaskEvent>,
    private risk: RiskService,
  ) {}

  async onApplicationBootstrap() {
    const admin = await this.users.findOne({ where: { role: UserRole.ADMIN } });
    if (admin) return;
    this.logger.log('数据库为空，初始化演示种子数据...');
    await this.seed();
    this.logger.log('种子数据初始化完成');
  }

  private hash(pwd: string) {
    return bcrypt.hashSync(pwd, 10);
  }

  private async makeUser(phone: string, pwd: string, name: string, role: UserRole, enterpriseId?: number) {
    const u = await this.users.save(
      this.users.create({
        phone,
        passwordHash: this.hash(pwd),
        name,
        role,
        enterpriseId: enterpriseId ?? null,
      }),
    );
    return u;
  }

  private async seed() {
    // ---------- 平台客服 ----------
    await this.makeUser('19900000001', 'admin123', '平台客服', UserRole.ADMIN);

    // ---------- 企业 ----------
    const ent1 = await this.makeUser('13800000001', '123456', '好又多商超连锁', UserRole.ENTERPRISE);
    const ent1Profile = await this.enterpriseProfiles.save(
      this.enterpriseProfiles.create({
        userId: ent1.id,
        companyName: '好又多商超连锁有限公司',
        creditCode: '91310115MA1K4A2B3C',
        contact: '王店长 13800000001',
        depositBalance: 50000,
      }),
    );
    const ent2 = await this.makeUser('13800000002', '123456', '星辉会展服务', UserRole.ENTERPRISE);
    const ent2Profile = await this.enterpriseProfiles.save(
      this.enterpriseProfiles.create({
        userId: ent2.id,
        companyName: '星辉会展服务有限公司',
        creditCode: '91310115MA1K4C7D8E',
        contact: '刘经理 13800000002',
        depositBalance: 80000,
      }),
    );

    // ---------- 现场主管 ----------
    await this.makeUser('13800000011', '123456', '赵主管(好又多)', UserRole.SUPERVISOR, ent1.id);
    await this.makeUser('13800000012', '123456', '钱主管(星辉)', UserRole.SUPERVISOR, ent2.id);

    // ---------- 工人 ----------
    const w1 = await this.makeUser('13900000001', '123456', '张三', UserRole.WORKER);
    const w1p = await this.workerProfiles.save(
      this.workerProfiles.create({
        userId: w1.id,
        realName: '张三',
        idCard: '310110199501011234',
        realNameVerified: true,
        healthCertNo: '沪健2026-011234',
        healthCertExpiry: '2027-05-01',
        skills: ['盘点', '分拣', '搬运'],
        riskNoticeSignedAt: new Date(),
      }),
    );
    const w2 = await this.makeUser('13900000002', '123456', '李四', UserRole.WORKER);
    const w2p = await this.workerProfiles.save(
      this.workerProfiles.create({
        userId: w2.id,
        realName: '李四',
        idCard: '320505199203054321',
        realNameVerified: true,
        skills: ['搭建', '安保'],
        riskNoticeSignedAt: new Date(),
      }),
    );
    const w3 = await this.makeUser('13900000003', '123456', '王五', UserRole.WORKER);
    await this.workerProfiles.save(
      this.workerProfiles.create({ userId: w3.id, realName: '', realNameVerified: false }),
    );

    const now = Date.now();
    const H = 3600000;
    const D = 24 * H;

    // ---------- 历史完工岗位（好又多，低风险） ----------
    for (let i = 4; i >= 1; i--) {
      const job = await this.jobs.save(
        this.jobs.create({
          enterpriseId: ent1.id,
          title: `门店夜间盘点（第${5 - i}期）`,
          category: JobCategory.INVENTORY,
          description: '门店打烊后库存盘点，需细心',
          location: '上海市浦东新区张江路 100 号',
          lat: 31.2044,
          lng: 121.5985,
          startTime: new Date(now - i * D),
          endTime: new Date(now - i * D + 6 * H),
          headcount: 2,
          approvedCount: 1,
          skillRequirements: ['盘点'],
          healthCertRequired: false,
          clothingRequirements: '深色便装',
          hourlyWage: 28,
          overtimeWage: 42,
          mealAllowance: 20,
          lateDeductPerMinute: 0.5,
          lateGraceMinutes: 10,
          insurancePlan: 'basic',
          riskLevel: JobRiskLevel.LOW,
          depositFrozen: 0,
          status: JobStatus.COMPLETED,
          publishedAt: new Date(now - i * D - D),
        }),
      );
      const worker = i % 2 === 0 ? w1 : w2;
      const wp = i % 2 === 0 ? w1p : w2p;
      await this.seedCompletedFlow(job, worker, wp, ent1, 6, 4 + (i % 3));
    }

    // ---------- 星辉历史：2 完工 + 3 取消 + 1 争议（高取消率/争议率 → 高风险） ----------
    for (let i = 1; i <= 2; i++) {
      const job = await this.jobs.save(
        this.jobs.create({
          enterpriseId: ent2.id,
          title: `展会搭建撤场（历史${i}）`,
          category: JobCategory.EXHIBITION,
          description: '展台搭建与撤场，体力活',
          location: '上海市青浦区国家会展中心',
          lat: 31.1909,
          lng: 121.2947,
          startTime: new Date(now - (10 + i) * D),
          endTime: new Date(now - (10 + i) * D + 8 * H),
          headcount: 5,
          approvedCount: 1,
          skillRequirements: ['搭建'],
          healthCertRequired: false,
          clothingRequirements: '工装、安全鞋',
          hourlyWage: 32,
          overtimeWage: 48,
          mealAllowance: 25,
          lateDeductPerMinute: 0.5,
          lateGraceMinutes: 10,
          insurancePlan: 'premium',
          riskLevel: JobRiskLevel.HIGH,
          depositFrozen: 0,
          status: JobStatus.COMPLETED,
          publishedAt: new Date(now - (11 + i) * D),
        }),
      );
      await this.seedCompletedFlow(job, w2, w2p, ent2, 8, 3);
    }
    for (let i = 1; i <= 3; i++) {
      await this.jobs.save(
        this.jobs.create({
          enterpriseId: ent2.id,
          title: `临时取消的会展帮工（历史${i}）`,
          category: JobCategory.EXHIBITION,
          description: '展会临时取消',
          location: '上海市浦东新区新国际博览中心',
          lat: 31.2152,
          lng: 121.5638,
          startTime: new Date(now - (20 + i) * D),
          endTime: new Date(now - (20 + i) * D + 8 * H),
          headcount: 8,
          approvedCount: 0,
          skillRequirements: [],
          healthCertRequired: false,
          clothingRequirements: '',
          hourlyWage: 30,
          overtimeWage: 45,
          mealAllowance: 20,
          lateDeductPerMinute: 0.5,
          lateGraceMinutes: 10,
          insurancePlan: 'standard',
          riskLevel: JobRiskLevel.MID,
          depositFrozen: 0,
          status: JobStatus.CANCELLED,
          publishedAt: new Date(now - (21 + i) * D),
          cancelledAt: new Date(now - (20 + i) * D),
          cancelReason: '展会档期调整',
        }),
      );
    }
    // 星辉争议历史：一笔已完工但发生扣款争议的结算（客服已裁决维持）
    {
      const job = await this.jobs.save(
        this.jobs.create({
          enterpriseId: ent2.id,
          title: '活动安保夜场（历史争议）',
          category: JobCategory.SECURITY,
          description: '夜间活动安保',
          location: '上海市黄浦区外滩金融中心',
          lat: 31.2336,
          lng: 121.4903,
          startTime: new Date(now - 15 * D),
          endTime: new Date(now - 15 * D + 8 * H),
          headcount: 4,
          approvedCount: 1,
          skillRequirements: ['安保'],
          healthCertRequired: false,
          clothingRequirements: '黑色正装',
          hourlyWage: 30,
          overtimeWage: 45,
          mealAllowance: 20,
          lateDeductPerMinute: 1,
          lateGraceMinutes: 5,
          insurancePlan: 'standard',
          riskLevel: JobRiskLevel.MID,
          depositFrozen: 0,
          status: JobStatus.COMPLETED,
          publishedAt: new Date(now - 16 * D),
        }),
      );
      const { task, settlement } = await this.seedCompletedFlow(job, w2, w2p, ent2, 8, 2, {
        lateMinutes: 20,
        deduction: 30,
        deductionReason: '着装不规范',
      });
      await this.events.save(
        this.events.create({
          taskId: task.id,
          type: TaskEventType.DEDUCTION,
          payload: { amount: 30, reason: '着装不规范' },
          reportedBy: ent2.id,
          reportedByRole: 'enterprise',
        }),
      );
      await this.appeals.save(
        this.appeals.create({
          settlementId: settlement.id,
          taskId: task.id,
          workerId: w2.id,
          enterpriseId: ent2.id,
          reason: '当天已按通知穿黑色正装，扣款不合理',
          evidence: [],
          status: AppealStatus.RESOLVED_MAINTAINED,
          resolutionNote: '现场照片显示未佩戴工牌，维持扣款',
          resolvedAt: new Date(now - 14 * D),
        }),
      );
    }

    // ---------- 当前可报名岗位 ----------
    const mkJob = (partial: Partial<Job>) => this.jobs.save(this.jobs.create(partial as Job));
    await mkJob({
      enterpriseId: ent1.id,
      title: '周末门店大盘点',
      category: JobCategory.INVENTORY,
      description: '周末全天门店盘点，两人一组，需会用盘点枪（现场培训）',
      location: '上海市浦东新区张江路 100 号',
      lat: 31.2044,
      lng: 121.5985,
      startTime: new Date(now + 2 * H),
      endTime: new Date(now + 10 * H),
      headcount: 3,
      approvedCount: 0,
      skillRequirements: ['盘点'],
      healthCertRequired: false,
      clothingRequirements: '深色便装、运动鞋',
      hourlyWage: 28,
      overtimeWage: 42,
      mealAllowance: 20,
      lateDeductPerMinute: 0.5,
      lateGraceMinutes: 10,
      insurancePlan: 'basic',
      riskLevel: JobRiskLevel.LOW,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(now - H),
      depositFrozen: 0,
    });
    await mkJob({
      enterpriseId: ent1.id,
      title: '仓库夜班分拣员',
      category: JobCategory.WAREHOUSE,
      description: '电商仓库夜班分拣，站立作业',
      location: '上海市嘉定区宝钱公路 5000 号',
      lat: 31.3522,
      lng: 121.2274,
      startTime: new Date(now + D),
      endTime: new Date(now + D + 8 * H),
      headcount: 5,
      approvedCount: 0,
      skillRequirements: ['分拣'],
      healthCertRequired: false,
      clothingRequirements: '长裤、防滑鞋',
      hourlyWage: 26,
      overtimeWage: 39,
      mealAllowance: 15,
      lateDeductPerMinute: 0.5,
      lateGraceMinutes: 15,
      insurancePlan: 'standard',
      riskLevel: JobRiskLevel.MID,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(now - H),
      depositFrozen: 0,
    });
    await mkJob({
      enterpriseId: ent1.id,
      title: '美食节餐饮帮工',
      category: JobCategory.CATERING,
      description: '美食节摊位帮工，需持有效健康证',
      location: '上海市静安区静安公园',
      lat: 31.2297,
      lng: 121.4487,
      startTime: new Date(now + 2 * D),
      endTime: new Date(now + 2 * D + 8 * H),
      headcount: 4,
      approvedCount: 0,
      skillRequirements: ['餐饮'],
      healthCertRequired: true,
      clothingRequirements: '白色上衣、深色裤子',
      hourlyWage: 27,
      overtimeWage: 40,
      mealAllowance: 30,
      lateDeductPerMinute: 0.5,
      lateGraceMinutes: 10,
      insurancePlan: 'standard',
      riskLevel: JobRiskLevel.MID,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(now - H),
      depositFrozen: 0,
    });
    await mkJob({
      enterpriseId: ent2.id,
      title: '车展展台搭建（高空作业）',
      category: JobCategory.EXHIBITION,
      description: '车展展台搭建，含 2-4 米高空作业，需佩戴安全装备',
      location: '上海市青浦区国家会展中心 3 号馆',
      lat: 31.1909,
      lng: 121.2947,
      startTime: new Date(now + 3 * H),
      endTime: new Date(now + 13 * H),
      headcount: 6,
      approvedCount: 0,
      skillRequirements: ['搭建'],
      healthCertRequired: false,
      clothingRequirements: '工装、安全鞋、安全帽（现场提供）',
      hourlyWage: 35,
      overtimeWage: 52,
      mealAllowance: 25,
      lateDeductPerMinute: 1,
      lateGraceMinutes: 5,
      insurancePlan: 'premium',
      riskLevel: JobRiskLevel.HIGH,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(now - H),
      depositFrozen: 0,
    });
    await mkJob({
      enterpriseId: ent2.id,
      title: '演唱会现场安保',
      category: JobCategory.SECURITY,
      description: '演唱会内场安保，需站姿端正、无纹身外露',
      location: '上海市徐汇区上海体育场',
      lat: 31.1836,
      lng: 121.4373,
      startTime: new Date(now + 3 * D),
      endTime: new Date(now + 3 * D + 6 * H),
      headcount: 10,
      approvedCount: 0,
      skillRequirements: ['安保'],
      healthCertRequired: false,
      clothingRequirements: '黑色正装、黑皮鞋',
      hourlyWage: 30,
      overtimeWage: 45,
      mealAllowance: 20,
      lateDeductPerMinute: 1,
      lateGraceMinutes: 5,
      insurancePlan: 'standard',
      riskLevel: JobRiskLevel.MID,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(now - H),
      depositFrozen: 0,
    });
    await mkJob({
      enterpriseId: ent1.id,
      title: '写字楼保洁突击（草稿示例）',
      category: JobCategory.CLEANING,
      description: '写字楼开荒保洁',
      location: '上海市杨浦区五角场',
      lat: 31.3012,
      lng: 121.5147,
      startTime: new Date(now + 4 * D),
      endTime: new Date(now + 4 * D + 6 * H),
      headcount: 6,
      approvedCount: 0,
      skillRequirements: ['保洁'],
      healthCertRequired: false,
      clothingRequirements: '便装',
      hourlyWage: 25,
      overtimeWage: 38,
      mealAllowance: 15,
      lateDeductPerMinute: 0.5,
      lateGraceMinutes: 10,
      insurancePlan: 'basic',
      riskLevel: JobRiskLevel.LOW,
      status: JobStatus.DRAFT,
    });

    // ---------- 一笔进行中的申诉（客服演示） ----------
    {
      const job = await mkJob({
        enterpriseId: ent2.id,
        title: '商场促销临促（申诉演示）',
        category: JobCategory.CLEANING,
        description: '商场促销活动协助',
        location: '上海市长宁区中山公园龙之梦',
        lat: 31.2184,
        lng: 121.4112,
        startTime: new Date(now - 2 * D),
        endTime: new Date(now - 2 * D + 8 * H),
        headcount: 2,
        approvedCount: 1,
        skillRequirements: [],
        healthCertRequired: false,
        clothingRequirements: '马甲（现场发）',
        hourlyWage: 26,
        overtimeWage: 39,
        mealAllowance: 20,
        lateDeductPerMinute: 0.5,
        lateGraceMinutes: 10,
        insurancePlan: 'standard',
        riskLevel: JobRiskLevel.MID,
        status: JobStatus.COMPLETED,
        publishedAt: new Date(now - 3 * D),
      });
      const { task, settlement } = await this.seedCompletedFlow(job, w1, w1p, ent2, 8, 0, {
        deduction: 50,
        deductionReason: '物料损耗',
      });
      await this.events.save(
        this.events.create({
          taskId: task.id,
          type: TaskEventType.DEDUCTION,
          payload: { amount: 50, reason: '物料损耗' },
          reportedBy: ent2.id,
          reportedByRole: 'enterprise',
        }),
      );
      await this.chats.save(
        this.chats.create({
          taskId: task.id,
          senderId: w1.id,
          senderRole: 'worker',
          senderName: '张三',
          content: '损耗的展架是进场时就坏的，我签到时拍了照片',
        }),
      );
      await this.chats.save(
        this.chats.create({
          taskId: task.id,
          senderId: ent2.id,
          senderRole: 'enterprise',
          senderName: '星辉会展服务',
          content: '损耗发生在你的当班期间，按规定需要承担',
        }),
      );
      settlement.status = SettlementStatus.APPEALED;
      await this.settlements.save(settlement);
      await this.appeals.save(
        this.appeals.create({
          settlementId: settlement.id,
          taskId: task.id,
          workerId: w1.id,
          enterpriseId: ent2.id,
          reason: '展架进场时已损坏，签到照片可证明，不应由我承担 50 元损耗扣款',
          evidence: [],
          status: AppealStatus.OPEN,
        }),
      );
      const ep2 = await this.enterpriseProfiles.findOne({ where: { userId: ent2.id } });
      ep2.disputedJobs += 1;
      await this.enterpriseProfiles.save(ep2);
    }

    // ---------- 企业风险指标重算 ----------
    ent1Profile.settledJobs = 4;
    await this.enterpriseProfiles.save(ent1Profile);
    ent2Profile.settledJobs = 3;
    ent2Profile.disputedJobs = 2;
    await this.enterpriseProfiles.save(ent2Profile);
    await this.risk.recomputeEnterprise(ent1.id);
    await this.risk.recomputeEnterprise(ent2.id);
  }

  /** 构造一条完整的历史完工流水：报名→派单→考勤→保险→结算→互评 */
  private async seedCompletedFlow(
    job: Job,
    worker: User,
    wp: WorkerProfile,
    enterprise: User,
    hours: number,
    rating: number,
    opts: { lateMinutes?: number; deduction?: number; deductionReason?: string } = {},
  ) {
    const app = await this.applications.save(
      this.applications.create({
        jobId: job.id,
        workerId: worker.id,
        status: ApplicationStatus.APPROVED,
        decidedAt: job.startTime,
      }),
    );
    const task = await this.tasks.save(
      this.tasks.create({
        jobId: job.id,
        workerId: worker.id,
        enterpriseId: enterprise.id,
        applicationId: app.id,
        qrCode: randomCode(8),
        status: TaskStatus.SETTLED,
      }),
    );
    const checkIn = new Date(new Date(job.startTime).getTime() + (opts.lateMinutes || 0) * 60000);
    const checkOut = new Date(checkIn.getTime() + hours * 3600000);
    await this.attendances.save(
      this.attendances.create({
        taskId: task.id,
        workerId: worker.id,
        checkInTime: checkIn,
        checkInLat: Number(job.lat),
        checkInLng: Number(job.lng),
        checkInDistance: 12,
        faceImage: '',
        faceVerified: true,
        qrVerified: true,
        geoVerified: true,
        supervisorConfirmedBy: enterprise.id,
        supervisorConfirmedAt: checkIn,
        checkOutTime: checkOut,
        checkOutLat: Number(job.lat),
        checkOutLng: Number(job.lng),
        effectiveHours: hours,
        lateMinutes: opts.lateMinutes || 0,
        status: AttendanceStatus.CHECKED_OUT,
      }),
    );
    const plan = INSURANCE_PLANS[job.insurancePlan] || INSURANCE_PLANS.standard;
    await this.policies.save(
      this.policies.create({
        taskId: task.id,
        workerId: worker.id,
        jobId: job.id,
        policyNo: `INS${task.id}${randomCode(6)}`,
        plan: job.insurancePlan,
        premium: plan.premium,
        coverageAmount: plan.coverage,
        effectiveAt: checkIn,
        expiresAt: new Date(checkOut.getTime() + 4 * 3600000),
        status: InsuranceStatus.EXPIRED,
      }),
    );
    const baseAmount = round2(hours * Number(job.hourlyWage));
    const lateDeduction = round2((opts.lateMinutes || 0) * Number(job.lateDeductPerMinute || 0));
    const deduction = opts.deduction || 0;
    const meal = Number(job.mealAllowance || 0);
    const gross = round2(baseAmount + meal - lateDeduction - deduction);
    const platformFee = round2(baseAmount * 0.05);
    const net = round2(gross - plan.premium);
    const settlement = await this.settlements.save(
      this.settlements.create({
        taskId: task.id,
        workerId: worker.id,
        enterpriseId: enterprise.id,
        jobId: job.id,
        scheduledHours: hours,
        actualHours: hours,
        baseHours: hours,
        overtimeHours: 0,
        baseAmount,
        overtimeAmount: 0,
        lateMinutes: opts.lateMinutes || 0,
        lateDeduction,
        mealAllowance: meal,
        otherDeductions: deduction,
        deductionReason: opts.deductionReason || '',
        insurancePremium: plan.premium,
        grossAmount: gross,
        platformFee,
        netAmount: net,
        items: [
          { label: `基础工时 ${hours}h × ¥${job.hourlyWage}/h`, amount: baseAmount },
          { label: '餐补', amount: meal },
          ...(lateDeduction ? [{ label: '迟到扣款', amount: -lateDeduction }] : []),
          ...(deduction ? [{ label: `扣款（${opts.deductionReason}）`, amount: -deduction }] : []),
          { label: '应发合计', amount: gross },
          { label: '保费', amount: -plan.premium },
          { label: '工人实收', amount: net },
        ],
        status: SettlementStatus.CONFIRMED,
        paidAt: checkOut,
      }),
    );
    wp.balance = round2(Number(wp.balance) + net);
    wp.totalJobs += 1;
    await this.workerProfiles.save(wp);
    await this.reviews.save(
      this.reviews.create({
        taskId: task.id,
        fromUserId: enterprise.id,
        toUserId: worker.id,
        rating,
        comment: rating >= 4 ? '干活利索，守时' : '基本完成任务',
      }),
    );
    const workerReviews = await this.reviews.find({ where: { toUserId: worker.id } });
    wp.ratingAvg = round2(workerReviews.reduce((s, r) => s + r.rating, 0) / workerReviews.length);
    wp.ratingCount = workerReviews.length;
    await this.workerProfiles.save(wp);
    return { task, settlement };
  }
}
