import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export type ClaimStatus =
  | 'REPORTED' // 已报案
  | 'INVESTIGATING'
  | 'APPROVED' // 保险理赔通过
  | 'REJECTED'; // 不在保障范围（如事故时保险未生效）

@Entity('injury_claims')
@Index(['jobEventId'])
export class InjuryClaim {
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

  @Column()
  jobEventId: number;

  @Column()
  insurancePolicyId: number;

  @Column({ type: 'text' })
  injuryDesc: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  claimAmount: number;

  @Column({ type: 'varchar', length: 16, default: 'REPORTED' })
  status: ClaimStatus;

  // 事故发生时保险是否在保障期内
  @Column({ type: 'boolean' })
  coveredAtOccurrence: boolean;

  @Column({ type: 'text', nullable: true })
  adjusterNote: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
