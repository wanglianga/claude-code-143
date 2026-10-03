import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TaskEventType {
  OVERTIME = 'overtime', // 临时加班
  POSITION_SWAP = 'position_swap', // 岗位调换
  EARLY_LEAVE = 'early_leave', // 工人早退
  EXTRA_WORK = 'extra_work', // 主管要求额外搬运等
  INJURY = 'injury', // 工人受伤
  JOB_CANCELLED = 'job_cancelled', // 企业取消岗位
  DEDUCTION = 'deduction', // 工资扣款
  NOTE = 'note', // 备注
}

@Entity('task_events')
export class TaskEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  taskId: number;

  @Column({ type: 'enum', enum: TaskEventType })
  type: TaskEventType;

  /** 事件参数：加班小时、扣款金额、受伤描述、现场照片等 */
  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, any>;

  @Column()
  reportedBy: number;

  @Column({ length: 32 })
  reportedByRole: string;

  @CreateDateColumn()
  createdAt: Date;
}
