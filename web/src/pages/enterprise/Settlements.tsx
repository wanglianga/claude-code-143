import React, { useEffect, useState } from 'react';
import { Button, Card, Table, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { fmtMoney, SETTLEMENT_STATUS, StatusTag } from '../../helpers';

export default function EntSettlements() {
  const [list, setList] = useState<any[]>([]);
  const navigate = useNavigate();

  const load = async () => {
    const data: any = await api.get('/enterprise/settlements');
    setList(data);
  };
  useEffect(() => {
    load();
  }, []);

  const pay = async (id: number) => {
    try {
      await api.post(`/settlements/${id}/pay`);
      message.success('支付成功');
      load();
    } catch {
      /* 已提示 */
    }
  };

  return (
    <Card title="结算管理（日结工资从冻结保证金划扣）">
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          { title: '结算单', dataIndex: 'id', width: 90, render: (v) => `#${v}` },
          { title: '岗位', dataIndex: 'jobTitle' },
          { title: '工时', render: (_, r) => `${r.actualHours}h（加班 ${r.overtimeHours}h）`, width: 140 },
          { title: '应发工资', render: (_, r) => fmtMoney(r.grossAmount), width: 110 },
          { title: '平台服务费', render: (_, r) => fmtMoney(r.platformFee), width: 110 },
          {
            title: '企业实付',
            width: 120,
            render: (_, r) => <b>{fmtMoney(Number(r.grossAmount) + Number(r.platformFee))}</b>,
          },
          { title: '状态', render: (_, r) => <StatusTag map={SETTLEMENT_STATUS} value={r.status} />, width: 110 },
          {
            title: '操作',
            width: 180,
            render: (_, r) => (
              <>
                <Button size="small" type="link" onClick={() => navigate(`/tasks/${r.taskId}`)}>明细</Button>
                {r.status === 'pending' && (
                  <Button size="small" type="primary" onClick={() => pay(r.id)}>确认支付</Button>
                )}
              </>
            ),
          },
        ]}
      />
    </Card>
  );
}
