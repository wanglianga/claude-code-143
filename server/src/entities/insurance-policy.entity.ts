import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum InsuranceStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CLAIMED = 'claimed',
  PAID_OUT = 'paid_out',
}

@Entity('insurance_policies')
export class InsurancePolicy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  taskId: number;

  @Column()
  workerId: number;

  @Column()
  jobId: number;

  @Column({ length: 40, unique: true })
  policyNo: string;

  @Column({ length: 32 })
  plan: string;

  /** 保费（元，工人承担，结算时从工资扣除） */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  premium: number;

  /** 保额（元） */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  coverageAmount: number;

  /** 生效时间 = 实际到岗确认时间，不可事后补录 */
  @Column({ type: 'datetime' })
  effectiveAt: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'enum', enum: InsuranceStatus, default: InsuranceStatus.ACTIVE })
  status: InsuranceStatus;

  @Column({ length: 500, default: '' })
  claimDescription: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  claimAmount: number;

  @Column({ type: 'datetime', nullable: true })
  claimedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
