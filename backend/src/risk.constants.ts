// 行业风险与企业风控常量

export type IndustryKey =
  | 'INVENTORY' // 商超盘点
  | 'EXHIBITION' // 会展搭建
  | 'WAREHOUSE' // 仓库分拣
  | 'CATERING' // 餐饮帮工
  | 'CLEANING' // 保洁突击
  | 'SECURITY'; // 活动安保

export interface IndustryProfile {
  key: IndustryKey;
  label: string;
  // 行业基础风险等级 1-5
  baseRiskLevel: number;
  // 基准保证金（元/岗）
  baseDeposit: number;
  // 是否强制要求健康证
  healthCertRequired: boolean;
  // 保险费率（占工资的比例），高风险行业保费更高
  insuranceRate: number;
}

export const INDUSTRIES: Record<IndustryKey, IndustryProfile> = {
  INVENTORY: { key: 'INVENTORY', label: '商超盘点', baseRiskLevel: 1, baseDeposit: 100, healthCertRequired: false, insuranceRate: 0.01 },
  EXHIBITION: { key: 'EXHIBITION', label: '会展搭建', baseRiskLevel: 4, baseDeposit: 300, healthCertRequired: false, insuranceRate: 0.03 },
  WAREHOUSE: { key: 'WAREHOUSE', label: '仓库分拣', baseRiskLevel: 3, baseDeposit: 200, healthCertRequired: false, insuranceRate: 0.02 },
  CATERING: { key: 'CATERING', label: '餐饮帮工', baseRiskLevel: 2, baseDeposit: 150, healthCertRequired: true, insuranceRate: 0.015 },
  CLEANING: { key: 'CLEANING', label: '保洁突击', baseRiskLevel: 2, baseDeposit: 150, healthCertRequired: false, insuranceRate: 0.015 },
  SECURITY: { key: 'SECURITY', label: '活动安保', baseRiskLevel: 5, baseDeposit: 400, healthCertRequired: false, insuranceRate: 0.04 },
};

// 企业风控阈值：长期高取消率 / 高争议率
export const RISK_THRESHOLDS = {
  // 近 N 单窗口
  windowSize: 10,
  highCancelRate: 0.15, // 取消率 > 15%
  highDisputeRate: 0.2, // 争议率（申诉且企业败诉/有责）> 20%
  highInjuryRate: 0.1, // 工伤率 > 10%
};

// 高风险企业的加严措施
export function depositMultiplier(enterpriseRiskLevel: number): number {
  // 风险等级 1-5：保证金倍率 1.0 ~ 3.0
  return 1 + (enterpriseRiskLevel - 1) * 0.5;
}

export function strictConfirmationRequired(enterpriseRiskLevel: number): boolean {
  return enterpriseRiskLevel >= 4;
}

// 企业综合风险等级：综合取消率、争议率、工伤率
export function computeEnterpriseRiskLevel(metrics: {
  cancelRate: number;
  disputeRate: number;
  injuryRate: number;
}): number {
  let score = 0;
  if (metrics.cancelRate >= RISK_THRESHOLDS.highCancelRate) score += 2;
  if (metrics.disputeRate >= RISK_THRESHOLDS.highDisputeRate) score += 2;
  if (metrics.injuryRate >= RISK_THRESHOLDS.highInjuryRate) score += 1;
  return Math.min(5, Math.max(1, 1 + score));
}
