import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Image,
  Input,
  InputNumber,
  List,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  message,
} from 'antd';
import api from '../../api';
import {
  APPEAL_STATUS,
  EVENT_TYPES,
  fmtFullTime,
  fmtMoney,
  INSURANCE_STATUS,
  StatusTag,
} from '../../helpers';

export default function AdminAppeals() {
  const [list, setList] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>();
  const [evidence, setEvidence] = useState<any>(null);
  const [resolving, setResolving] = useState<any>(null);
  const [action, setAction] = useState<'reissue' | 'maintain' | 'escalate'>('reissue');
  const [note, setNote] = useState('');
  const [reissueAmount, setReissueAmount] = useState<number>(0);

  const load = async () => {
    const data: any = await api.get('/appeals', { params: statusFilter ? { status: statusFilter } : {} });
    setList(data);
  };
  useEffect(() => {
    load();
  }, [statusFilter]);

  const openEvidence = async (id: number) => {
    const d: any = await api.get(`/appeals/${id}/evidence`);
    setEvidence(d);
  };

  const resolve = async () => {
    try {
      await api.post(`/appeals/${resolving.id}/resolve`, {
        action,
        note,
        reissueAmount: action === 'reissue' ? reissueAmount : undefined,
      });
      message.success('裁决已生效');
      setResolving(null);
      setNote('');
      setEvidence(null);
      load();
    } catch {
      /* 已提示 */
    }
  };

  return (
    <Card
      title="申诉工单（客服裁决：补发 / 维持扣款 / 升级仲裁）"
      extra={
        <Select
          allowClear
          placeholder="按状态筛选"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={Object.entries(APPEAL_STATUS).map(([v, s]) => ({ label: s.text, value: v }))}
        />
      }
    >
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          { title: '工单', dataIndex: 'id', width: 70, render: (v) => `#${v}` },
          { title: '岗位', dataIndex: 'jobTitle' },
          { title: '工人', dataIndex: 'workerName', width: 90 },
          { title: '企业', dataIndex: 'enterpriseName', width: 130 },
          { title: '申诉原因', dataIndex: 'reason', ellipsis: true },
          {
            title: '争议金额',
            width: 110,
            render: (_, r) => fmtMoney(Number(r.settlement?.lateDeduction || 0) + Number(r.settlement?.otherDeductions || 0)),
          },
          { title: '状态', render: (_, r) => <StatusTag map={APPEAL_STATUS} value={r.status} />, width: 110 },
          {
            title: '操作',
            width: 190,
            render: (_, r) => (
              <Space size={4}>
                <Button size="small" type="link" onClick={() => openEvidence(r.id)}>取证</Button>
                {['open', 'escalated'].includes(r.status) && (
                  <Button size="small" type="primary" onClick={() => { setResolving(r); setReissueAmount(Number(r.settlement?.otherDeductions || 0) + Number(r.settlement?.lateDeduction || 0)); }}>
                    裁决
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      {/* 取证抽屉 */}
      <Drawer
        title={`申诉 #${evidence?.appeal?.id} 取证视图`}
        open={!!evidence}
        onClose={() => setEvidence(null)}
        width={640}
      >
        {evidence && (
          <div>
            <Card size="small" title="申诉信息" style={{ marginBottom: 12 }}>
              <p><b>原因：</b>{evidence.appeal.reason}</p>
              <p style={{ marginBottom: 0 }}>
                <b>状态：</b><StatusTag map={APPEAL_STATUS} value={evidence.appeal.status} />
                {evidence.appeal.resolutionNote && <span style={{ marginLeft: 8, color: '#888' }}>{evidence.appeal.resolutionNote}</span>}
              </p>
              {evidence.appeal.evidence?.length > 0 && (
                <Image.PreviewGroup>
                  <Space style={{ marginTop: 8 }}>
                    {evidence.appeal.evidence.map((url: string) => (
                      <Image key={url} src={url} width={90} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              )}
            </Card>

            <Card size="small" title="签到轨迹与主管确认" style={{ marginBottom: 12 }}>
              {evidence.attendance ? (
                <Descriptions size="small" column={1} bordered>
                  <Descriptions.Item label="签到">
                    {fmtFullTime(evidence.attendance.checkInTime)}（距岗位 {evidence.attendance.checkInDistance} 米，
                    定位{evidence.attendance.geoVerified ? '✓' : '✗'} 人脸{evidence.attendance.faceVerified ? '✓' : '✗'} 二维码{evidence.attendance.qrVerified ? '✓' : '✗'}）
                  </Descriptions.Item>
                  <Descriptions.Item label="主管确认">
                    {evidence.attendance.supervisorConfirmedAt
                      ? `${fmtFullTime(evidence.attendance.supervisorConfirmedAt)}（${evidence.supervisorName || '主管'}）`
                      : '无（低风险自动确认）'}
                  </Descriptions.Item>
                  <Descriptions.Item label="签退">
                    {fmtFullTime(evidence.attendance.checkOutTime)} · 有效工时 {evidence.attendance.effectiveHours}h · 迟到 {evidence.attendance.lateMinutes} 分钟
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <p style={{ color: '#999' }}>无考勤记录</p>
              )}
            </Card>

            <Card size="small" title="结算明细" style={{ marginBottom: 12 }}>
              {evidence.settlement?.items?.map((it: any) => (
                <div key={it.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{it.label}</span>
                  <span style={{ color: it.amount < 0 ? '#cf1322' : undefined }}>{fmtMoney(it.amount)}</span>
                </div>
              ))}
            </Card>

            <Card size="small" title="任务事件" style={{ marginBottom: 12 }}>
              <Timeline
                items={(evidence.events || []).map((e: any) => ({
                  children: (
                    <span>
                      <Tag color={EVENT_TYPES[e.type]?.color}>{EVENT_TYPES[e.type]?.text}</Tag>
                      {JSON.stringify(e.payload)}
                      <span style={{ color: '#bbb', fontSize: 11, marginLeft: 6 }}>{fmtFullTime(e.createdAt)}</span>
                    </span>
                  ),
                }))}
              />
            </Card>

            <Card size="small" title="聊天记录" style={{ marginBottom: 12 }}>
              <List
                size="small"
                dataSource={evidence.chats || []}
                locale={{ emptyText: '无聊天记录' }}
                renderItem={(c: any) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <span><Tag>{c.senderName}</Tag>{c.content}
                      <span style={{ color: '#bbb', fontSize: 11, marginLeft: 6 }}>{fmtFullTime(c.createdAt)}</span>
                    </span>
                  </List.Item>
                )}
              />
            </Card>

            <Card size="small" title="保险">
              {evidence.policy ? (
                <p style={{ marginBottom: 0 }}>
                  {evidence.policy.policyNo} · 生效 {fmtFullTime(evidence.policy.effectiveAt)} ·{' '}
                  <StatusTag map={INSURANCE_STATUS} value={evidence.policy.status} />
                </p>
              ) : (
                <p style={{ color: '#999', marginBottom: 0 }}>无保单</p>
              )}
            </Card>
          </div>
        )}
      </Drawer>

      {/* 裁决弹窗 */}
      <Modal
        title={`裁决申诉 #${resolving?.id}`}
        open={!!resolving}
        onOk={resolve}
        onCancel={() => setResolving(null)}
        okText="提交裁决"
      >
        <Radio.Group
          style={{ marginBottom: 16 }}
          value={action}
          onChange={(e) => setAction(e.target.value)}
          options={[
            { label: '补发（企业保证金赔付）', value: 'reissue' },
            { label: '维持扣款', value: 'maintain' },
            { label: '升级仲裁', value: 'escalate' },
          ]}
        />
        {action === 'reissue' && (
          <div style={{ marginBottom: 12 }}>
            补发金额：
            <InputNumber min={0.01} value={reissueAmount} onChange={(v) => setReissueAmount(v || 0)} prefix="¥" />
          </div>
        )}
        <Input.TextArea rows={3} placeholder="裁决说明（将通知双方并留档）" value={note} onChange={(e) => setNote(e.target.value)} />
      </Modal>
    </Card>
  );
}
