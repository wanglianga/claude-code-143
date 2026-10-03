import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Table, Tag } from 'antd';
import api from '../../api';
import { fmtMoney, RISK_LEVEL, StatusTag } from '../../helpers';

export default function AdminRisk() {
  const [enterprises, setEnterprises] = useState<any[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);

  useEffect(() => {
    api.get('/risk/enterprises').then((d: any) => setEnterprises(d));
    api.get('/risk/industries').then((d: any) => setIndustries(d));
  }, []);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}>
        <Card title="企业风险画像（高取消率/高争议率 → 更高保证金倍率 + 严格现场确认）" size="small">
          <Table
            rowKey="id"
            size="small"
            dataSource={enterprises}
            pagination={false}
            columns={[
              { title: '企业', dataIndex: 'companyName' },
              { title: '发单/取消', render: (_, r) => `${r.totalJobs} / ${r.cancelledJobs}`, width: 100 },
              { title: '取消率', render: (_, r) => `${(r.cancelRate * 100).toFixed(0)}%`, width: 80 },
              { title: '争议率', render: (_, r) => `${(r.disputeRate * 100).toFixed(0)}%`, width: 80 },
              { title: '风险等级', render: (_, r) => <StatusTag map={RISK_LEVEL} value={r.riskLevel} />, width: 90 },
              { title: '保证金倍率', render: (_, r) => `×${r.depositMultiplier}`, width: 90 },
              {
                title: '严格现场确认',
                width: 100,
                render: (_, r) => (r.strictConfirm ? <Tag color="red">是</Tag> : <Tag>否</Tag>),
              },
              { title: '保证金余额', render: (_, r) => fmtMoney(r.depositBalance), width: 110 },
            ]}
          />
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card title="行业岗位风险沉淀" size="small">
          <Table
            rowKey="category"
            size="small"
            dataSource={industries}
            pagination={false}
            columns={[
              { title: '行业', dataIndex: 'category' },
              { title: '岗位数', dataIndex: 'jobCount', width: 70 },
              { title: '工伤', dataIndex: 'injuryCount', width: 60 },
              { title: '争议', dataIndex: 'disputeEvents', width: 60 },
              { title: '风险分', dataIndex: 'riskScore', width: 70 },
              { title: '等级', render: (_, r) => <StatusTag map={RISK_LEVEL} value={r.riskLevel} />, width: 80 },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}
