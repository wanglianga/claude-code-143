import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, DatePicker, Descriptions, Form, Input, Select, Statistic, Tag, message } from 'antd';
import dayjs from 'dayjs';
import api from '../../api';
import { useAuth } from '../../auth';
import { fmtMoney } from '../../helpers';

const SKILL_OPTIONS = ['盘点', '分拣', '搬运', '搭建', '餐饮', '保洁', '安保', '收银'];

export default function WorkerProfile() {
  const { workerProfile, refresh } = useAuth();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workerProfile) {
      form.setFieldsValue({
        realName: workerProfile.realName,
        idCard: workerProfile.idCard,
        healthCertNo: workerProfile.healthCertNo,
        healthCertExpiry: workerProfile.healthCertExpiry ? dayjs(workerProfile.healthCertExpiry) : null,
        skills: workerProfile.skills || [],
      });
    }
  }, [workerProfile]);

  const save = async (values: any) => {
    setSaving(true);
    try {
      await api.put('/worker/profile', {
        ...values,
        healthCertExpiry: values.healthCertExpiry ? values.healthCertExpiry.format('YYYY-MM-DD') : null,
      });
      message.success('资料已保存，实名核验通过（演示环境模拟）');
      await refresh();
    } catch {
      /* 已提示 */
    } finally {
      setSaving(false);
    }
  };

  const signRiskNotice = async () => {
    try {
      await api.post('/worker/risk-notice');
      message.success('已签署《临时用工风险告知书》');
      await refresh();
    } catch {
      /* 已提示 */
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <Card title="我的档案" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 40, marginBottom: 16 }}>
          <Statistic title="账户余额（可提现）" value={fmtMoney(workerProfile?.balance)} />
          <Statistic title="历史评分" value={workerProfile?.ratingAvg || 0} suffix={`/ 5（${workerProfile?.ratingCount || 0} 条）`} />
          <Statistic title="累计完工" value={workerProfile?.totalJobs || 0} suffix="单" />
        </div>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="实名认证">
            {workerProfile?.realNameVerified ? <Tag color="green">已认证</Tag> : <Tag color="red">未认证</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="风险告知书">
            {workerProfile?.riskNoticeSignedAt ? (
              <Tag color="green">已签署</Tag>
            ) : (
              <Button size="small" type="primary" danger onClick={signRiskNotice}>
                立即签署
              </Button>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="健康证">{workerProfile?.healthCertNo || '未登记'}</Descriptions.Item>
          <Descriptions.Item label="健康证有效期">{workerProfile?.healthCertExpiry || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="实名与资质（演示环境模拟公安实名核验）">
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="报名岗位前必须完成实名认证并签署风险告知书；餐饮类岗位需有效健康证。"
        />
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="realName" label="真实姓名" rules={[{ required: true, message: '请输入真实姓名' }]}>
            <Input placeholder="与身份证一致" style={{ maxWidth: 320 }} />
          </Form.Item>
          <Form.Item name="idCard" label="身份证号" rules={[{ required: true, message: '请输入身份证号' }]}>
            <Input placeholder="18 位身份证号" maxLength={18} style={{ maxWidth: 320 }} />
          </Form.Item>
          <Form.Item name="healthCertNo" label="健康证编号（选填）">
            <Input placeholder="餐饮类岗位必需" style={{ maxWidth: 320 }} />
          </Form.Item>
          <Form.Item name="healthCertExpiry" label="健康证有效期（选填）">
            <DatePicker />
          </Form.Item>
          <Form.Item name="skills" label="技能标签">
            <Select mode="multiple" options={SKILL_OPTIONS.map((s) => ({ label: s, value: s }))} placeholder="选择技能" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            保存并实名核验
          </Button>
        </Form>
      </Card>
    </div>
  );
}
