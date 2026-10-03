import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

// 双向评价：工人评企业、企业评工人，沉淀历史评价用于报名门禁
@Entity('reviews')
@Index(['assignmentId'])
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  assignmentId: number;

  @Column()
  jobId: number;

  // REVIEWER -> TARGET
  @Column()
  reviewerId: number;

  @Column({ length: 16 })
  reviewerRole: string;

  @Column()
  targetId: number;

  @Column({ length: 16 })
  targetRole: string;

  @Column({ type: 'int' }) // 1-5
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
