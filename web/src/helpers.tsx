import { Tag } from 'antd';
import React from 'react';
import dayjs from 'dayjs';

export const fmtTime = (t?: string | Date) => (t ? dayjs(t).format('MM-DD HH:mm') : '-');
export const fmtFullTime = (t?: string | Date) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-');
export const fmtMoney = (n?: number | string) => `¥${Number(n || 0).toFixed(2)}`;

export const JOB_STATUS: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '报名中', color: 'green' },
  closed: { text: '已招满', color: 'orange' },
  cancelled: { text: '已取消', color: 'red' },
  completed: { text: '已完结', color: 'blue' },
};

export const TASK_STATUS: Record<string, { text: string; color: string }> = {
  assigned: { text: '待签到', color: 'gold' },
  checked_in: { text: '已签到待确认', color: 'orange' },
  confirmed: { text: '作业中', color: 'processing' },
  checked_out: { text: '已签退', color: 'blue' },
  settled: { text: '已结算', color: 'success' },
  cancelled: { text: '已取消', color: 'red' },
};

export const SETTLEMENT_STATUS: Record<string, { text: string; color: string }> = {
  pending: { text: '待企业支付', color: 'gold' },
  confirmed: { text: '已支付', color: 'success' },
  appealed: { text: '申诉中', color: 'red' },
};

export const APPEAL_STATUS: Record<string, { text: string; color: string }> = {
  open: { text: '待处理', color: 'red' },
  resolved_reissue: { text: '已补发', color: 'green' },
  resolved_maintained: { text: '维持原结算', color: 'blue' },
  escalated: { text: '仲裁中', color: 'purple' },
  arbitrated: { text: '仲裁结案', color: 'geekblue' },
};

export const EVENT_TYPES: Record<string, { text: string; color: string }> = {
  overtime: { text: '临时加班', color: 'blue' },
  position_swap: { text: '岗位调换', color: 'cyan' },
  early_leave: { text: '工人早退', color: 'orange' },
  extra_work: { text: '额外工作', color: 'geekblue' },
  injury: { text: '工人受伤', color: 'red' },
  job_cancelled: { text: '企业取消岗位', color: 'red' },
  deduction: { text: '工资扣款', color: 'volcano' },
  note: { text: '备注', color: 'default' },
};

export const RISK_LEVEL: Record<string, { text: string; color: string }> = {
  low: { text: '低风险', color: 'green' },
  mid: { text: '中风险', color: 'orange' },
  high: { text: '高风险', color: 'red' },
};

export const INSURANCE_STATUS: Record<string, { text: string; color: string }> = {
  active: { text: '保障中', color: 'green' },
  expired: { text: '已过期', color: 'default' },
  claimed: { text: '理赔中', color: 'orange' },
  paid_out: { text: '已赔付', color: 'blue' },
};

export function StatusTag({ map, value }: { map: Record<string, any>; value: string }) {
  const item = map[value] || { text: value || '-', color: 'default' };
  return <Tag color={item.color}>{item.text}</Tag>;
}
