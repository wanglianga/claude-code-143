import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum JobCategory {
  INVENTORY = '商超盘点',
  EXHIBITION = '会展搭建',
  WAREHOUSE = '仓库分拣',
  CATERING = '餐饮帮工',
  CLEANING = '保洁突击',
  SECURITY = '活动安保',
}

export enum JobStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum JobRiskLevel {
  LOW = 'low',
  MID = 'mid',
  HIGH = 'high',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  enterpriseId: number;

  @Column({ length: 128 })
  title: string;

  @Column({ type: 'enum', enum: JobCategory })
  category: JobCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 255 })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  lng: number;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({ default: 1 })
  headcount: number;

  @Column({ default: 0 })
  approvedCount: number;

  /** 技能要求 */
  @Column({ type: 'simple-json', nullable: true })
  skillRequirements: string[];

  @Column({ default: false })
  healthCertRequired: boolean;

  @Column({ length: 255, default: '' })
  clothingRequirements: string;

  /** 工资：时薪（元/小时） */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  hourlyWage: number;

  /** 加班时薪 */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  overtimeWage: number;

  /** 餐补 */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  mealAllowance: number;

  /** 迟到每分钟扣款 */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lateDeductPerMinute: number;

  /** 迟到宽限分钟 */
  @Column({ default: 10 })
  lateGraceMinutes: number;

  /** 结算方式：日结 */
  @Column({ length: 32, default: 'daily' })
  settlementType: string;

  /** 保险方案 */
  @Column({ length: 32, default: 'standard' })
  insurancePlan: string;

  @Column({ type: 'enum', enum: JobRiskLevel, default: JobRiskLevel.LOW })
  riskLevel: JobRiskLevel;

  /** 发单时冻结的企业保证金 */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  depositFrozen: number;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.DRAFT })
  status: JobStatus;

  /** 现场主管 user id */
  @Column({ nullable: true })
  supervisorId: number;

  @Column({ type: 'datetime', nullable: true })
  publishedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date;

  @Column({ length: 255, default: '' })
  cancelReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
