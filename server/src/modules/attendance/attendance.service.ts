import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { Task, TaskStatus } from '../../entities/task.entity';
import { Job, JobRiskLevel } from '../../entities/job.entity';
import { EnterpriseProfile } from '../../entities/enterprise-profile.entity';
import { InsuranceService } from '../insurance/insurance.service';
import { SettlementsService } from '../settlements/settlements.service';
import { distanceMeters, floorHalfHour, hoursBetween } from '../../common/utils';
import { GEO_FENCE_METERS } from '../../common/constants';
import { AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

/**
 * 考勤四重校验：定位（地理围栏）+ 人脸采集 + 签到二维码 + 现场主管确认。
 * 高风险岗位或高风险企业（strictConfirm）必须主管现场确认后考勤才生效，
 * 保险生效时间随之与「实际到岗确认时间」绑定。
 */
@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private attendances: Repository<Attendance>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Job) private jobs: Repository<Job>,
    @InjectRepository(EnterpriseProfile) private enterpriseProfiles: Repository<EnterpriseProfile>,
    private insurance: InsuranceService,
    private settlements: SettlementsService,
  ) {}

  /** 企业/主管获取签到二维码（现场展示给工人扫） */
  async getQrCode(user: AuthUser, taskId: number) {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    if (user.role === UserRole.ENTERPRISE && task.enterpriseId !== user.id)
      throw new ForbiddenException('无权查看');
    if (user.role === UserRole.SUPERVISOR && task.enterpriseId !== user.enterpriseId)
      throw new ForbiddenException('无权查看');
    return { qrCode: task.qrCode, taskId: task.id };
  }

  /** 工人签到：二维码 + 定位 + 人脸 */
  async checkIn(
    workerUserId: number,
    taskId: number,
    dto: { qrCode: string; lat: number; lng: number; faceImage?: string },
  ) {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task || task.workerId !== workerUserId) throw new NotFoundException('任务不存在');
    if (task.status !== TaskStatus.ASSIGNED) {
      throw new BadRequestException('当前状态不可签到');
    }
    const job = await this.jobs.findOne({ where: { id: task.jobId } });
    if (!job) throw new NotFoundException('岗位不存在');

    // 1. 二维码校验
    if (!dto.qrCode || dto.qrCode.toUpperCase() !== task.qrCode) {
      throw new BadRequestException('签到二维码错误，请扫描现场主管出示的二维码');
    }
    // 2. 定位校验（地理围栏）
    const lat = Number(dto.lat);
    const lng = Number(dto.lng);
    if (isNaN(lat) || isNaN(lng)) throw new BadRequestException('请提供签到定位');
    const distance = distanceMeters(lat, lng, Number(job.lat), Number(job.lng));
    if (distance > GEO_FENCE_METERS) {
      throw new BadRequestException(
        `当前位置距岗位地点约 ${distance} 米，超出 ${GEO_FENCE_METERS} 米签到范围`,
      );
    }
    // 3. 人脸采集校验（演示环境模拟活体比对通过）
    if (!dto.faceImage) {
      throw new BadRequestException('请先完成人脸采集再签到');
    }

    const now = new Date();
    const start = new Date(job.startTime);
    const graceMs = (job.lateGraceMinutes || 0) * 60000;
    const lateMinutes = Math.max(
      0,
      Math.floor((now.getTime() - start.getTime() - graceMs) / 60000),
    );

    let attendance = await this.attendances.findOne({ where: { taskId } });
    if (!attendance) {
      attendance = this.attendances.create({ taskId, workerId: workerUserId });
    }
    Object.assign(attendance, {
      checkInTime: now,
      checkInLat: lat,
      checkInLng: lng,
      checkInDistance: distance,
      faceImage: dto.faceImage,
      faceVerified: true,
      qrVerified: true,
      geoVerified: true,
      lateMinutes,
    });

    // 4. 现场主管确认：高风险岗位/高风险企业必须人工确认
    const enterprise = await this.enterpriseProfiles.findOne({
      where: { userId: task.enterpriseId },
    });
    const needSupervisor =
      job.riskLevel === JobRiskLevel.HIGH || enterprise?.strictConfirm === true;

    if (needSupervisor) {
      attendance.status = AttendanceStatus.PENDING_CONFIRM;
      await this.attendances.save(attendance);
      task.status = TaskStatus.CHECKED_IN;
      await this.tasks.save(task);
      return {
        attendance,
        needSupervisorConfirm: true,
        message: '签到成功，该岗位为高风险岗位/企业，需现场主管确认后考勤与保险生效',
      };
    }

    // 低风险：四要素齐备自动确认，保险立即生效（生效时间=实际签到时间）
    attendance.status = AttendanceStatus.CONFIRMED;
    await this.attendances.save(attendance);
    task.status = TaskStatus.CONFIRMED;
    await this.tasks.save(task);
    const insuranceError = await this.tryIssueInsurance(taskId, now);
    return {
      attendance,
      needSupervisorConfirm: false,
      message: insuranceError || '签到成功，考勤已确认，保险已生效',
    };
  }

  /** 现场主管/企业确认到岗 */
  async confirm(user: AuthUser, taskId: number) {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    if (user.role === UserRole.ENTERPRISE && task.enterpriseId !== user.id)
      throw new ForbiddenException('无权操作');
    if (user.role === UserRole.SUPERVISOR && task.enterpriseId !== user.enterpriseId)
      throw new ForbiddenException('无权操作');
    if (user.role !== UserRole.ENTERPRISE && user.role !== UserRole.SUPERVISOR)
      throw new ForbiddenException('仅企业或现场主管可确认到岗');

    const attendance = await this.attendances.findOne({ where: { taskId } });
    if (!attendance || !attendance.checkInTime) {
      throw new BadRequestException('工人尚未签到');
    }
    if (attendance.status !== AttendanceStatus.PENDING_CONFIRM) {
      throw new BadRequestException('考勤已确认');
    }
    const now = new Date();
    attendance.status = AttendanceStatus.CONFIRMED;
    attendance.supervisorConfirmedBy = user.id;
    attendance.supervisorConfirmedAt = now;
    await this.attendances.save(attendance);
    task.status = TaskStatus.CONFIRMED;
    await this.tasks.save(task);
    // 保险自主管确认实际到岗之时生效
    const insuranceError = await this.tryIssueInsurance(taskId, now);
    return { attendance, message: insuranceError || '到岗已确认，保险已生效' };
  }

  /** 尝试签发保单；若已存在受伤事件则拒绝补录并返回提示（不阻断考勤） */
  private async tryIssueInsurance(taskId: number, effectiveAt: Date): Promise<string | null> {
    try {
      await this.insurance.issueForTask(taskId, effectiveAt);
      return null;
    } catch (e: any) {
      return `考勤已确认，但保险未生效：${e?.message || '不可补录'}`;
    }
  }

  /** 工人签退：计算有效工时并自动生成日结单 */
  async checkOut(workerUserId: number, taskId: number, dto: { lat: number; lng: number }) {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task || task.workerId !== workerUserId) throw new NotFoundException('任务不存在');
    if (![TaskStatus.CONFIRMED, TaskStatus.CHECKED_IN].includes(task.status)) {
      throw new BadRequestException('当前状态不可签退');
    }
    const attendance = await this.attendances.findOne({ where: { taskId } });
    if (!attendance || attendance.status !== AttendanceStatus.CONFIRMED) {
      throw new BadRequestException('考勤未确认，无法签退');
    }
    const now = new Date();
    attendance.checkOutTime = now;
    attendance.checkOutLat = Number(dto.lat) || null;
    attendance.checkOutLng = Number(dto.lng) || null;
    attendance.effectiveHours = Math.max(
      0.5,
      floorHalfHour(hoursBetween(new Date(attendance.checkInTime), now)),
    );
    attendance.status = AttendanceStatus.CHECKED_OUT;
    await this.attendances.save(attendance);
    task.status = TaskStatus.CHECKED_OUT;
    await this.tasks.save(task);
    const settlement = await this.settlements.generateForTask(taskId);
    return { attendance, settlement, message: '签退成功，日结单已生成，待企业确认支付' };
  }
}
