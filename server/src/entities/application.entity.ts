import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('applications')
@Unique(['jobId', 'workerId'])
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  jobId: number;

  @Column()
  @Index()
  workerId: number;

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  status: ApplicationStatus;

  @Column({ length: 255, default: '' })
  rejectReason: string;

  @CreateDateColumn()
  appliedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  decidedAt: Date;
}
