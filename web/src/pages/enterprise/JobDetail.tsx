import React, { useEffect, useState } from 'react';
import { Button, Card, Descriptions, Drawer, Input, Modal, Space, Table, Tabs, Tag, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { fmtMoney, fmtTime, JOB_STATUS, SETTLEMENT_STATUS, StatusTag, TASK_STATUS } from '../../helpers';

export default function EntJobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [workerDetail, setWorkerDetail] = useState<any>(null);
  const [rejecting, setRejecting] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    const [j, a, t]: any[] = await Promise.all([
      api.get(`/jobs/${id}`),
      api.get(`/jobs/${id}/applications`),
      api.get(`/jobs/${id}/tasks`),
    ]);
    setJob(j);
    setApps(a);
    setTasks(t);
  };
  useEffect(() => {
    load();
  }, [id]);

  const approve = async (appId: number) => {
    try {
      await api.post(`/applications/${appId}/approve`);
      message.success('已录用，派单任务已生成（含签到二维码）');
      load();
    } catch {
      /* 已提示 */
    }
  };

  const reject = async () => {
    await api.post(`/applications/${rejecting.id}/reject`, { reason: rejectReason });
    message.success('已拒绝');
    setRejecting(null);
    load();
  };

  const viewWorker = async (workerId: number) => {
    const p: any = await api.get(`/workers/${workerId}/profile`);
    setWorkerDetail(p);
  };

  if (!job) return null;

  return (
    <div>
      <Card
        title={
          <Space>
            {job.title}
            <StatusTag map={JOB_STATUS} value={job.status} />
          </Space>
        }
        extra={<Button onClick={() => navigate('/ent/jobs')}>返回列表</Button>}
      >
        <Descriptions size="small" column={{ xs: 1, md: 4 }} bordered>
          <Descriptions.Item label="类目">{job.category}</Descriptions.Item>
          <Descriptions.Item label="时间">{fmtTime(job.startTime)} ~ {fmtTime(job.endTime)}</Descriptions.Item>
          <Descriptions.Item label="地点">{job.location}</Descriptions.Item>
          <Descriptions.Item label="人数">{job.approvedCount}/{job.headcount}</Descriptions.Item>
          <Descriptions.Item label="时薪">{fmtMoney(job.hourlyWage)}</Descriptions.Item>
          <Descriptions.Item label="加班">{fmtMoney(job.overtimeWage || job.hourlyWage * 1.5)}/h</Descriptions.Item>
          <Descriptions.Item label="餐补">{fmtMoney(job.mealAllowance)}</Descriptions.Item>
          <Descriptions.Item label="冻结保证金">{fmtMoney(job.depositFrozen)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginTop: 16 }} size="small">
        <Tabs
          items={[
            {
              key: 'apps',
              label: `报名审核（${apps.filter((a) => a.status === 'pending').length} 待处理）`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={apps}
                  pagination={false}
                  columns={[
                    { title: '工人', render: (_, r) => r.worker?.name },
                    { title: '手机号', render: (_, r) => r.worker?.phone },
                    {
                      title: '资质',
                      render: (_, r) => (
                        <Space size={4}>
                          {r.workerProfile?.realNameVerified ? <Tag color="green">实名✓</Tag> : <Tag color="red">未实名</Tag>}
                          {r.workerProfile?.riskNoticeSignedAt && <Tag color="blue">风险告知✓</Tag>}
                          {r.workerProfile?.healthCertNo && <Tag color="cyan">健康证</Tag>}
                        </Space>
                      ),
                    },
                    {
                      title: '评分/完工',
                      render: (_, r) => `${r.workerProfile?.ratingAvg || 0} 分 / ${r.workerProfile?.totalJobs || 0} 单`,
                    },
                    {
                      title: '状态',
                      render: (_, r) => (
                        <Tag color={{ pending: 'gold', approved: 'green', rejected: 'red', cancelled: 'default' }[r.status]}>
                          {{ pending: '待审核', approved: '已录用', rejected: '已拒绝', cancelled: '已取消' }[r.status]}
                        </Tag>
                      ),
                    },
                    {
                      title: '操作',
                      render: (_, r) => (
                        <Space size={4}>
                          <Button size="small" type="link" onClick={() => viewWorker(r.workerId)}>档案</Button>
                          {r.status === 'pending' && (
                            <>
                              <Button size="small" type="primary" onClick={() => approve(r.id)}>录用</Button>
                              <Button size="small" danger onClick={() => setRejecting(r)}>拒绝</Button>
                            </>
                          )}
                        </Space>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'tasks',
              label: `派单任务（${tasks.length}）`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={tasks}
                  pagination={false}
                  columns={[
                    { title: '任务号', dataIndex: 'id', width: 80, render: (v) => `#${v}` },
                    { title: '工人', render: (_, r) => r.worker?.name },
                    { title: '任务状态', render: (_, r) => <StatusTag map={TASK_STATUS} value={r.status} /> },
                    {
                      title: '结算',
                      render: (_, r) => (r.settlementStatus ? <StatusTag map={SETTLEMENT_STATUS} value={r.settlementStatus} /> : '-'),
                    },
                    {
                      title: '操作',
                      render: (_, r) => (
                        <Button size="small" type="link" onClick={() => navigate(`/tasks/${r.id}`)}>
                          任务详情（考勤/保险/事件/结算）
                        </Button>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <Drawer title="工人档案" open={!!workerDetail} onClose={() => setWorkerDetail(null)} width={420}>
        {workerDetail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="姓名">{workerDetail.realName || workerDetail.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{workerDetail.phone}</Descriptions.Item>
            <Descriptions.Item label="身份证">{workerDetail.idCard || '-'}</Descriptions.Item>
            <Descriptions.Item label="实名认证">{workerDetail.realNameVerified ? '已通过' : '未认证'}</Descriptions.Item>
            <Descriptions.Item label="健康证">{workerDetail.healthCertNo || '-'}（{workerDetail.healthCertExpiry || '-'}）</Descriptions.Item>
            <Descriptions.Item label="技能">{(workerDetail.skills || []).join('、') || '-'}</Descriptions.Item>
            <Descriptions.Item label="历史评价">{workerDetail.ratingAvg} 分（{workerDetail.ratingCount} 条）</Descriptions.Item>
            <Descriptions.Item label="累计完工">{workerDetail.totalJobs} 单</Descriptions.Item>
            <Descriptions.Item label="风险告知书">
              {workerDetail.riskNoticeSignedAt ? `已签署（${fmtTime(workerDetail.riskNoticeSignedAt)}）` : '未签署'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title="拒绝报名"
        open={!!rejecting}
        onOk={reject}
        onCancel={() => setRejecting(null)}
        okText="确认拒绝"
      >
        <Input.TextArea rows={3} placeholder="拒绝原因" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
      </Modal>
    </div>
  );
}
