import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne,
} from 'typeorm';
import { IndustryKey } from '../risk.constants';

export type JobStatus =
  | 'OPEN' // 招募中
  | 'FULL' // 已报满
  | 'IN_PROGRESS' // 作业中
  | 'COMPLETED' // 正常结束
  | 'CANCELLED'; // 企业取消

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  enterpriseId: number;

  @Column({ length: 64 })
  title: string;

  @Column({ type: 'varchar', length: 16 })
  industry: IndustryKey;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 128 })
  location: string;

  // 签到定位点（地理围栏圆心）
  @Column({ type: 'decimal', precision: 10, scale: 6, default: 31.2304 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 121.4737 })
  lng: number;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({ type: 'int' })
  headcount: number;

  @Column({ type: 'text' })
  skillRequirement: string;

  // 是否要求健康证（餐饮默认要求）
  @Column({ type: 'boolean', default: false })
  requireHealthCert: boolean;

  @Column({ length: 128, nullable: true })
  dressCode: string | null;

  // 日结工资（元/人/班）
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  dailyWage: number;

  // 加班费（元/小时）
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 25 })
  overtimeRate: number;

  // 餐补（元/班）
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  mealAllowance: number;

  // 迟到每分钟扣款（元）
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  lateDeductPerMin: number;

  // 宽限分钟（不扣款）
  @Column({ type: 'int', default: 5 })
  lateGraceMinutes: number;

  // 保险：保额（万元）与保费（元/人）
  @Column({ type: 'int', default: 30 })
  insuranceCoverageWan: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  insurancePremium: number;

  // 结算方式
  @Column({ length: 32, default: '日结-完工24小时内' })
  settlementMethod: string;

  // 平台服务费率（向企业收取，占工资比例）
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.08 })
  platformFeeRate: number;

  @Column({ type: 'varchar', length: 16, default: 'OPEN' })
  status: JobStatus;

  // 发布时按行业基准与企业风险等级计算并冻结的保证金
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  depositRequired: number;

  @Column({ type: 'boolean', default: false })
  depositPaid: boolean;

  // 高风险企业：需要更严格现场确认（双人主管确认）
  @Column({ type: 'boolean', default: false })
  strictConfirmation: boolean;

  // 企业预付工资款（用于日结）
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  prepayment: number;

  @Column({ type: 'int', nullable: true })
  cancelledBy: number | null;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancelReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
