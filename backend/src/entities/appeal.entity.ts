import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export type AppealStatus =
  | 'OPEN' // 工人申诉中
  | 'UPHELD' // 维持扣款（工人败诉）
  | 'REISSUED' // 补发（工人胜诉）
  | 'ARBITRATION' // 升级仲裁
  | 'ARBITRATION_AWARD'; // 仲裁裁决完成

@Entity('appeals')
@Index(['assignmentId'])
export class Appeal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  assignmentId: number;

  @Column()
  jobId: number;

  @Column()
  workerId: number;

  @Column()
  enterpriseId: number;

  @Column({ type: 'text' })
  reason: string;

  // 工人诉求补发金额
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  claimedAmount: number;

  @Column({ type: 'varchar', length: 24, default: 'OPEN' })
  status: AppealStatus;

  // 客服可查看的证据快照：签到轨迹、主管确认、现场照片、聊天记录
  @Column({ type: 'text', nullable: true })
  evidenceSummary: string | null;

  @Column({ type: 'int', nullable: true })
  handledBy: number | null;

  @Column({ type: 'datetime', nullable: true })
  handledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  decisionNote: string | null;

  // 裁决补发金额
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  reissueAmount: number | null;

  // 仲裁裁决
  @Column({ type: 'text', nullable: true })
  arbitrationAward: string | null;

  @Column({ type: 'datetime', nullable: true })
  arbitratedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
