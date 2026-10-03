import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AttendanceStatus {
  PENDING_CONFIRM = 'pending_confirm',
  CONFIRMED = 'confirmed',
  CHECKED_OUT = 'checked_out',
}

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  taskId: number;

  @Column()
  workerId: number;

  // ---- 签到 ----
  @Column({ type: 'datetime', nullable: true })
  checkInTime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  checkInLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  checkInLng: number;

  /** 与岗位地点的距离（米） */
  @Column({ type: 'int', nullable: true })
  checkInDistance: number;

  /** 人脸采集照片地址 */
  @Column({ length: 255, default: '' })
  faceImage: string;

  @Column({ default: false })
  faceVerified: boolean;

  @Column({ default: false })
  qrVerified: boolean;

  @Column({ default: false })
  geoVerified: boolean;

  /** 现场主管确认 */
  @Column({ nullable: true })
  supervisorConfirmedBy: number;

  @Column({ type: 'datetime', nullable: true })
  supervisorConfirmedAt: Date;

  // ---- 签退 ----
  @Column({ type: 'datetime', nullable: true })
  checkOutTime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  checkOutLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  checkOutLng: number;

  /** 有效工时（小时，0.5 粒度） */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  effectiveHours: number;

  @Column({ default: 0 })
  lateMinutes: number;

  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PENDING_CONFIRM })
  status: AttendanceStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
