import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  WORKER = 'worker',
  ENTERPRISE = 'enterprise',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 32 })
  phone: string;

  @Column({ length: 128 })
  passwordHash: string;

  @Column({ length: 64 })
  name: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  /** 主管所属企业 user id */
  @Column({ nullable: true })
  enterpriseId: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
