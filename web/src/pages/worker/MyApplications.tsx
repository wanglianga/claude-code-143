import React, { useEffect, useState } from 'react';
import { Button, Card, Popconfirm, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { fmtTime } from '../../helpers';

const APP_STATUS: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'gold' },
  approved: { text: '已录用', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' },
  cancelled: { text: '已取消', color: 'default' },
};

export default function MyApplications() {
  const [list, setList] = useState<any[]>([]);
  const navigate = useNavigate();

  const load = async () => {
    const data: any = await api.get('/my/applications');
    setList(data);
  };
  useEffect(() => {
    load();
  }, []);

  const cancel = async (id: number) => {
    await api.post(`/applications/${id}/cancel`);
    load();
  };

  return (
    <Card title="我的报名">
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          { title: '岗位', render: (_, r) => r.job?.title },
          { title: '类目', render: (_, r) => r.job?.category },
          { title: '时间', render: (_, r) => `${fmtTime(r.job?.startTime)} ~ ${fmtTime(r.job?.endTime)}` },
          { title: '时薪', render: (_, r) => `¥${r.job?.hourlyWage}/h` },
          {
            title: '状态',
            render: (_, r) => {
              const s = APP_STATUS[r.status] || {};
              return (
                <>
                  <Tag color={s.color}>{s.text}</Tag>
                  {r.status === 'rejected' && <span style={{ color: '#999', fontSize: 12 }}>{r.rejectReason}</span>}
                </>
              );
            },
          },
          {
            title: '操作',
            render: (_, r) => (
              <>
                {r.status === 'pending' && (
                  <Popconfirm title="确定取消报名？" onConfirm={() => cancel(r.id)}>
                    <Button size="small" danger>取消报名</Button>
                  </Popconfirm>
                )}
                {r.status === 'approved' && (
                  <Button size="small" type="link" onClick={() => navigate('/my/tasks')}>
                    去做任务 →
                  </Button>
                )}
              </>
            ),
          },
        ]}
      />
    </Card>
  );
}
