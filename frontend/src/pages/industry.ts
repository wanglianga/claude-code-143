export interface IndustryOption {
  key: string;
  label: string;
  baseRiskLevel: number;
  baseDeposit: number;
  healthCertRequired: boolean;
  insuranceRate: number;
}

export const INDUSTRIES: Record<string, IndustryOption> = {
  INVENTORY: { key: 'INVENTORY', label: '商超盘点', baseRiskLevel: 1, baseDeposit: 100, healthCertRequired: false, insuranceRate: 0.01 },
  EXHIBITION: { key: 'EXHIBITION', label: '会展搭建', baseRiskLevel: 4, baseDeposit: 300, healthCertRequired: false, insuranceRate: 0.03 },
  WAREHOUSE: { key: 'WAREHOUSE', label: '仓库分拣', baseRiskLevel: 3, baseDeposit: 200, healthCertRequired: false, insuranceRate: 0.02 },
  CATERING: { key: 'CATERING', label: '餐饮帮工', baseRiskLevel: 2, baseDeposit: 150, healthCertRequired: true, insuranceRate: 0.015 },
  CLEANING: { key: 'CLEANING', label: '保洁突击', baseRiskLevel: 2, baseDeposit: 150, healthCertRequired: false, insuranceRate: 0.015 },
  SECURITY: { key: 'SECURITY', label: '活动安保', baseRiskLevel: 5, baseDeposit: 400, healthCertRequired: false, insuranceRate: 0.04 },
};
