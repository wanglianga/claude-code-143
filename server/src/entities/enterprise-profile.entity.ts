import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EnterpriseRiskLevel {
  LOW = 'low',
  MID = 'mid',
  HIGH = 'high',
}

@Entity('enterprise_profiles')
export class EnterpriseProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @Column({ length: 128, default: '' })
  companyName: string;

  @Column({ length: 64, default: '' })
  creditCode: string;

  @Column({ length: 64, default: '' })
  contact: string;

  /** 可用保证金余额 */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  depositBalance: number;

  /** 发单冻结中的保证金（企业预付款） */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  frozenDeposit: number;

  @Column({ type: 'enum', enum: EnterpriseRiskLevel, default: EnterpriseRiskLevel.LOW })
  riskLevel: EnterpriseRiskLevel;

  @Column({ default: 0 })
  totalJobs: number;

  @Column({ default: 0 })
  cancelledJobs: number;

  @Column({ default: 0 })
  disputedJobs: number;

  @Column({ default: 0 })
  settledJobs: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  cancelRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  disputeRate: number;

  /** 保证金倍率（风险越高越高） */
  @Column({ type: 'decimal', precision: 4, scale: 2, default: 1 })
  depositMultiplier: number;

  /** 高风险企业：考勤必须现场主管确认 */
  @Column({ default: false })
  strictConfirm: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
