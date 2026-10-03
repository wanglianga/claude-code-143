/** 平台业务常量 */

export const INSURANCE_PLANS: Record<
  string,
  { name: string; premium: number; coverage: number }
> = {
  basic: { name: '基础意外险', premium: 3, coverage: 100000 },
  standard: { name: '标准意外险', premium: 6, coverage: 300000 },
  premium: { name: '高额意外险', premium: 10, coverage: 500000 },
};

/** 平台服务费率（向企业收取，按应发工资比例） */
export const PLATFORM_FEE_RATE = 0.05;

/** 企业取消岗位时，对已录用工人的补偿比例（按预估日薪） */
export const CANCEL_COMPENSATION_RATE = 0.3;

/** 签到允许的地理围栏半径（米） */
export const GEO_FENCE_METERS = 500;

/** 岗位风险 → 推荐保险方案 */
export const RISK_RECOMMENDED_PLAN: Record<string, string> = {
  low: 'basic',
  mid: 'standard',
  high: 'premium',
};
