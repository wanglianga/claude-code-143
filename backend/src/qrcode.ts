import { createHash } from 'crypto';
import { config } from './config';

// 岗位动态签到二维码：按分钟轮换的一次性口令（演示）
const SECRET = 'gig-qrcode-demo-secret';

function bucket(date = new Date()): number {
  return Math.floor(date.getTime() / 60000);
}

export function currentQrToken(jobId: number, date = new Date()): string {
  const b = bucket(date);
  return createHash('sha256').update(`${jobId}:${b}:${SECRET}`).digest('hex').slice(0, 8).toUpperCase();
}

export function verifyQrToken(jobId: number, token: string, date = new Date()): boolean {
  if (!token) return false;
  const b = bucket(date);
  const norm = token.trim().toUpperCase();
  // 允许前后 1 分钟时钟偏差
  for (const delta of [0, -1, 1]) {
    const t = createHash('sha256').update(`${jobId}:${b + delta}:${SECRET}`).digest('hex').slice(0, 8).toUpperCase();
    if (t === norm) return true;
  }
  return false;
}

export function qrExpireSeconds(date = new Date()): number {
  return 60 - Math.floor((date.getTime() % 60000) / 1000);
}

export { config };
