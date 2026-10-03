import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('worker_profiles')
export class WorkerProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @Column({ length: 64, default: '' })
  realName: string;

  @Column({ length: 32, default: '' })
  idCard: string;

  /** 实名认证是否通过（演示环境模拟通过） */
  @Column({ default: false })
  realNameVerified: boolean;

  @Column({ length: 64, default: '' })
  healthCertNo: string;

  @Column({ type: 'date', nullable: true })
  healthCertExpiry: string;

  /** 技能标签 */
  @Column({ type: 'simple-json', nullable: true })
  skills: string[];

  /** 风险告知书签署时间 */
  @Column({ type: 'datetime', nullable: true })
  riskNoticeSignedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAvg: number;

  @Column({ default: 0 })
  ratingCount: number;

  @Column({ default: 0 })
  totalJobs: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
