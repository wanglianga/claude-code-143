import React, { useEffect, useState } from 'react';
import { Button, Card, Input, Modal, Table, message } from 'antd';
import api from '../../api';
import { fmtFullTime, fmtMoney, INSURANCE_STATUS, StatusTag } from '../../helpers';

export default function MyInsurance() {
  const [list, setList] = useState<any[]>([]);
  const [claiming, setClaiming] = useState<any>(null);
  const [desc, setDesc] = useState('');

  const load = async () => {
    const data: any = await api.get('/my/insurance');
    setList(data);
  };
  useEffect(() => {
    load();
  }, []);

  const claim = async () => {
    try {
      await api.post(`/insurance/${claiming.id}/claim`, { description: desc });
      message.success('理赔申请已提交并赔付（演示）');
      setClaiming(null);
      load();
    } catch {
      /* 已提示 */
    }
  };

  return (
    <Card title="我的保单（保险生效时间 = 实际到岗确认时间，事故后不可补录）">
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          { title: '保单号', dataIndex: 'policyNo', width: 200 },
          { title: '岗位', dataIndex: 'jobTitle' },
          { title: '方案', dataIndex: 'plan', width: 90 },
          { title: '保费', render: (_, r) => fmtMoney(r.premium), width: 90 },
          { title: '保额', render: (_, r) => fmtMoney(r.coverageAmount), width: 110 },
          { title: '生效时间', render: (_, r) => fmtFullTime(r.effectiveAt), width: 170 },
          { title: '状态', render: (_, r) => <StatusTag map={INSURANCE_STATUS} value={r.status} />, width: 90 },
          {
            title: '操作',
            render: (_, r) =>
              r.status === 'active' && (
                <Button size="small" danger onClick={() => setClaiming(r)}>
                  受伤理赔
                </Button>
              ),
          },
        ]}
      />
      <Modal
        title={`申请理赔 - ${claiming?.policyNo}`}
        open={!!claiming}
        onOk={claim}
        onCancel={() => setClaiming(null)}
        okText="提交理赔"
      >
        <p style={{ color: '#888' }}>需先在任务中上报「工人受伤」事件，且受伤时间晚于保单生效时间。</p>
        <Input.TextArea
          rows={3}
          placeholder="受伤情况描述"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </Modal>
    </Card>
  );
}
