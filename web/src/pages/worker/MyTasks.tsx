import React, { useEffect, useState } from 'react';
import { Button, Card, Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { fmtTime, SETTLEMENT_STATUS, StatusTag, TASK_STATUS } from '../../helpers';

export default function MyTasks() {
  const [list, setList] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/my/tasks').then((d: any) => setList(d));
  }, []);

  return (
    <Card title="我的任务（派单 / 考勤 / 保险 / 工时 / 日结 同一任务视图）">
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          { title: '任务号', dataIndex: 'id', width: 80, render: (v) => `#${v}` },
          { title: '岗位', render: (_, r) => r.job?.title },
          { title: '时间', render: (_, r) => `${fmtTime(r.job?.startTime)} ~ ${fmtTime(r.job?.endTime)}` },
          { title: '任务状态', render: (_, r) => <StatusTag map={TASK_STATUS} value={r.status} /> },
          {
            title: '结算',
            render: (_, r) => (r.settlementStatus ? <StatusTag map={SETTLEMENT_STATUS} value={r.settlementStatus} /> : '-'),
          },
          {
            title: '操作',
            render: (_, r) => (
              <Button type="link" size="small" onClick={() => navigate(`/tasks/${r.id}`)}>
                进入任务
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
}
