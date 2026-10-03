import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SettlementStatus {
  PENDING = 'pending', // 已生成，待企业确认付款
  CONFIRMED = 'confirmed', // 企业已确认并支付
  APPEALED = 'appealed', // 工人申诉中
}

@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  taskId: number;

  @Column()
  workerId: number;

  @Column()
  enterpriseId: number;

  @Column()
  jobId: number;

  // ---- 工时 ----
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  scheduledHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  actualHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  baseHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overtimeHours: number;

  // ---- 金额 ----
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  overtimeAmount: number;

  @Column({ default: 0 })
  lateMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lateDeduction: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  mealAllowance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  otherDeductions: number;

  @Column({ length: 255, default: '' })
  deductionReason: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  insurancePremium: number;

  /** 应发合计（企业承担） */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  grossAmount: number;

  /** 平台服务费（企业额外承担） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformFee: number;

  /** 工人实收 = 应发 - 保费 */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  netAmount: number;

  /** 明细快照（计算过程） */
  @Column({ type: 'simple-json', nullable: true })
  items: { label: string; amount: number }[];

  @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.PENDING })
  status: SettlementStatus;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
