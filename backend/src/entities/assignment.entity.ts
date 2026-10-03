import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export type AssignmentStatus =
  | 'APPLIED' // 已报名
  | 'ACCEPTED' // 企业录取
  | 'REJECTED' // 未录取
  | 'CHECKED_IN' // 已到岗签到
  | 'WORKING' // 作业中（保险生效）
  | 'LEFT_EARLY' // 早退
  | 'COMPLETED' // 完工签退
  | 'NO_SHOW' // 爽约
  | 'CANCELLED'; // 岗位取消

@Entity('assignments')
@Index(['jobId', 'workerId'], { unique: true })
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobId: number;

  @Column()
  workerId: number;

  @Column({ type: 'varchar', length: 16, default: 'APPLIED' })
  status: AssignmentStatus;

  // 报名时确认已阅读风险告知
  @Column({ type: 'boolean', default: false })
  riskAcknowledged: boolean;

  @Column({ type: 'datetime', nullable: true })
  appliedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  acceptedAt: Date | null;

  // 历史评价快照（报名门禁时写入，便于审计）
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5 })
  ratingSnapshot: number;

  @Column({ type: 'int', default: 0 })
  completedJobsCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
