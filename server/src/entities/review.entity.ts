import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('reviews')
@Unique(['taskId', 'fromUserId'])
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  taskId: number;

  @Column()
  fromUserId: number;

  @Column()
  @Index()
  toUserId: number;

  @Column({ type: 'int' })
  rating: number;

  @Column({ length: 500, default: '' })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;
}
