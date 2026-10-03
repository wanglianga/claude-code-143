import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, InputNumber, Modal, Row, Statistic, Table, Tag, message } from 'antd';
import api from '../../api';
import { fmtMoney, RISK_LEVEL, StatusTag } from '../../helpers';

export default function EntDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [amount, setAmount] = useState(1000);

  const load = async () => {
    const [p, t]: any[] = await Promise.all([api.get('/enterprise/profile'), api.get('/enterprise/wallet')]);
    setProfile(p);
    setTxs(t);
  };
  useEffect(() => {
    load();
  }, []);

  const recharge = async () => {
    await api.post('/enterprise/deposit/recharge', { amount });
    message.success('充值成功');
    setRechargeOpen(false);
    load();
  };

  if (!profile) return null;

  return (
    <div>
      {profile.riskLevel !== 'low' && (
        <Alert
          style={{ marginBottom: 16 }}
          type={profile.riskLevel === 'high' ? 'error' : 'warning'}
          showIcon
          message={`企业风险等级为「${RISK_LEVEL[profile.riskLevel]?.text}」：发单保证金倍率 ×${profile.depositMultiplier}${profile.strictConfirm ? '，且考勤必须现场主管确认' : ''}`}
        />
      )}
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="保证金可用余额" value={fmtMoney(profile.depositBalance)} /></Card></Col>
        <Col span={6}><Card><Statistic title="发单冻结中（预付工资）" value={fmtMoney(profile.frozenDeposit)} /></Card></Col>
        <Col span={6}>
          <Card>
            <Statistic title="取消率 / 争议率" value={`${(profile.cancelRate * 100).toFixed(0)}% / ${(profile.disputeRate * 100).toFixed(0)}%`} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ marginBottom: 8 }}>风险等级：<StatusTag map={RISK_LEVEL} value={profile.riskLevel} /></div>
            <Button type="primary" onClick={() => setRechargeOpen(true)}>保证金充值</Button>
          </Card>
        </Col>
      </Row>

      <Card title="保证金流水" style={{ marginTop: 16 }} size="small">
        <Table
          rowKey="id"
          size="small"
          dataSource={txs}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: '时间', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleString('zh-CN'), width: 180 },
            { title: '类型', dataIndex: 'type', width: 120, render: (v) => <Tag>{({ recharge: '充值', freeze: '发单冻结', unfreeze: '解冻', payment: '工资支付', platform_fee: '平台服务费', compensation: '取消补偿', appeal_reissue: '申诉补发' } as any)[v] || v}</Tag> },
            { title: '金额', dataIndex: 'amount', render: (v) => fmtMoney(v), width: 120 },
            { title: '变动后余额', dataIndex: 'balanceAfter', render: (v) => fmtMoney(v), width: 130 },
            { title: '备注', dataIndex: 'note' },
          ]}
        />
      </Card>

      <Modal title="保证金充值" open={rechargeOpen} onOk={recharge} onCancel={() => setRechargeOpen(false)} okText="充值">
        <p style={{ color: '#888' }}>发单时需按「预估工资 × 风险倍率」冻结保证金作为工人工资预付保障。</p>
        <InputNumber min={1} value={amount} onChange={(v) => setAmount(v || 0)} style={{ width: '100%' }} prefix="¥" />
      </Modal>
    </div>
  );
}
