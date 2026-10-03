import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaskStatus {
  ASSIGNED = 'assigned',
  CHECKED_IN = 'checked_in',
  CONFIRMED = 'confirmed',
  CHECKED_OUT = 'checked_out',
  SETTLED = 'settled',
  CANCELLED = 'cancelled',
}

/**
 * 派单任务：同一任务内聚合派单、考勤、保险、工时、事件、评价与日结金额。
 */
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  jobId: number;

  @Column()
  @Index()
  workerId: number;

  @Column()
  enterpriseId: number;

  @Column()
  applicationId: number;

  /** 签到二维码内容（企业/主管现场展示，工人扫码/输入） */
  @Column({ length: 32 })
  qrCode: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.ASSIGNED })
  status: TaskStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
