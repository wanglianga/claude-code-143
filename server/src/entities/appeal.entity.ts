import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AppealStatus {
  OPEN = 'open',
  RESOLVED_REISSUE = 'resolved_reissue', // 补发
  RESOLVED_MAINTAINED = 'resolved_maintained', // 维持扣款
  ESCALATED = 'escalated', // 升级仲裁
  ARBITRATED = 'arbitrated', // 仲裁完结
}

@Entity('appeals')
export class Appeal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  settlementId: number;

  @Column()
  @Index()
  taskId: number;

  @Column()
  workerId: number;

  @Column()
  enterpriseId: number;

  @Column({ length: 500 })
  reason: string;

  /** 证据：现场照片 url 列表 */
  @Column({ type: 'simple-json', nullable: true })
  evidence: string[];

  @Column({ type: 'enum', enum: AppealStatus, default: AppealStatus.OPEN })
  status: AppealStatus;

  @Column({ nullable: true })
  handlerId: number;

  @Column({ length: 500, default: '' })
  resolutionNote: string;

  /** 补发金额 */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  reissueAmount: number;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
