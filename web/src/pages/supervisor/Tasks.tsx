import React, { useEffect, useState } from 'react';
import { Button, Card, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { fmtTime, StatusTag, TASK_STATUS } from '../../helpers';

export default function SupTasks() {
  const [list, setList] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/supervisor/tasks').then((d: any) => setList(d));
  }, []);

  return (
    <Card title="现场任务（出示签到码、确认到岗、上报现场事件）">
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          { title: '任务号', dataIndex: 'id', width: 80, render: (v) => `#${v}` },
          { title: '岗位', render: (_, r) => r.job?.title },
          { title: '工人', render: (_, r) => r.worker?.name },
          { title: '时间', render: (_, r) => `${fmtTime(r.job?.startTime)} ~ ${fmtTime(r.job?.endTime)}` },
          { title: '状态', render: (_, r) => <StatusTag map={TASK_STATUS} value={r.status} /> },
          {
            title: '考勤',
            render: (_, r) =>
              r.attendanceStatus === 'pending_confirm' ? (
                <Tag color="orange">待现场确认</Tag>
              ) : r.attendanceStatus ? (
                <Tag color="green">{r.attendanceStatus === 'confirmed' ? '已确认' : '已签退'}</Tag>
              ) : (
                <Tag>未签到</Tag>
              ),
          },
          {
            title: '操作',
            render: (_, r) => (
              <Button size="small" type="link" onClick={() => navigate(`/tasks/${r.id}`)}>
                进入现场
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
}
