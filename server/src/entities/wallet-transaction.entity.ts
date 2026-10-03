import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum WalletTxType {
  RECHARGE = 'recharge', // 保证金充值
  FREEZE = 'freeze', // 发单冻结
  UNFREEZE = 'unfreeze', // 解冻
  PAYMENT = 'payment', // 工资支付
  PLATFORM_FEE = 'platform_fee',
  COMPENSATION = 'compensation', // 取消岗位补偿
  APPEAL_REISSUE = 'appeal_reissue', // 申诉补发
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  enterpriseId: number;

  @Column({ type: 'enum', enum: WalletTxType })
  type: WalletTxType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({ nullable: true })
  jobId: number;

  @Column({ nullable: true })
  taskId: number;

  @Column({ length: 255, default: '' })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}
