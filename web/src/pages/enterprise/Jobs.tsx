import React, { useEffect, useState } from 'react';
import { Button, Card, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { fmtMoney, fmtTime, JOB_STATUS, StatusTag } from '../../helpers';

export default function EntJobs() {
  const [list, setList] = useState<any[]>([]);
  const [cancelJob, setCancelJob] = useState<any>(null);
  const [reason, setReason] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    const data: any = await api.get('/jobs/mine');
    setList(data);
  };
  useEffect(() => {
    load();
  }, []);

  const publish = async (id: number) => {
    try {
      await api.post(`/jobs/${id}/publish`);
      message.success('发布成功，保证金已冻结');
      load();
    } catch {
      /* 已提示 */
    }
  };

  const doCancel = async () => {
    try {
      const res: any = await api.post(`/jobs/${cancelJob.id}/cancel`, { reason });
      message.success(`已取消，补偿 ${res.compensatedWorkers} 名工人各 ${fmtMoney(res.compensation)}`);
      setCancelJob(null);
      load();
    } catch {
      /* 已提示 */
    }
  };

  return (
    <Card
      title="岗位管理"
      extra={<Button type="primary" onClick={() => navigate('/ent/jobs/new')}>发布新岗位</Button>}
    >
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          { title: '岗位', dataIndex: 'title' },
          { title: '类目', dataIndex: 'category', width: 100 },
          { title: '时间', render: (_, r) => `${fmtTime(r.startTime)}~${fmtTime(r.endTime)}`, width: 150 },
          { title: '人数', render: (_, r) => `${r.approvedCount}/${r.headcount}`, width: 80 },
          { title: '时薪', render: (_, r) => fmtMoney(r.hourlyWage), width: 90 },
          { title: '冻结保证金', render: (_, r) => fmtMoney(r.depositFrozen), width: 110 },
          { title: '状态', render: (_, r) => <StatusTag map={JOB_STATUS} value={r.status} />, width: 90 },
          {
            title: '操作',
            width: 240,
            render: (_, r) => (
              <Space size={4}>
                <Button size="small" type="link" onClick={() => navigate(`/ent/jobs/${r.id}`)}>详情</Button>
                {r.status === 'draft' && (
                  <>
                    <Button size="small" type="link" onClick={() => navigate(`/ent/jobs/${r.id}/edit`)}>编辑</Button>
                    <Popconfirm title="发布将冻结保证金，确认发布？" onConfirm={() => publish(r.id)}>
                      <Button size="small" type="link">发布</Button>
                    </Popconfirm>
                  </>
                )}
                {['published', 'closed'].includes(r.status) && (
                  <Button size="small" type="link" danger onClick={() => setCancelJob(r)}>取消</Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={`取消岗位「${cancelJob?.title}」`}
        open={!!cancelJob}
        onOk={doCancel}
        onCancel={() => setCancelJob(null)}
        okText="确认取消"
        okButtonProps={{ danger: true }}
      >
        <p style={{ color: '#cf1322' }}>
          取消将按预估日薪的 30% 补偿已录用工人，并计入企业取消率（影响风险等级与后续发单保证金倍率）。
        </p>
        <Input.TextArea rows={3} placeholder="取消原因" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </Card>
  );
}
