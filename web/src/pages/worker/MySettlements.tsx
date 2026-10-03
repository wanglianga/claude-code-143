import React, { useEffect, useState } from 'react';
import { Button, Card, Input, Modal, Table, Tag, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { fmtMoney, fmtTime, SETTLEMENT_STATUS, StatusTag } from '../../helpers';

export default function MySettlements() {
  const [list, setList] = useState<any[]>([]);
  const [appealing, setAppealing] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const navigate = useNavigate();

  const load = async () => {
    const data: any = await api.get('/my/settlements');
    setList(data);
  };
  useEffect(() => {
    load();
  }, []);

  const uploadProps = {
    name: 'file',
    action: '/api/upload',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    onChange(info: any) {
      if (info.file.status === 'done') {
        setEvidence((prev) => [...prev, info.file.response.url]);
        message.success('证据照片已上传');
      }
    },
  };

  const submitAppeal = async () => {
    if (reason.trim().length < 5) {
      message.warning('请填写申诉原因（至少 5 字）');
      return;
    }
    try {
      await api.post(`/settlements/${appealing.id}/appeal`, { reason, evidence });
      message.success('申诉已提交，客服将查看签到轨迹、主管确认、现场照片与聊天记录进行裁决');
      setAppealing(null);
      setReason('');
      setEvidence([]);
      load();
    } catch {
      /* 已提示 */
    }
  };

  return (
    <Card title="我的结算（日结明细）">
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          { title: '结算单', dataIndex: 'id', width: 80, render: (v) => `#${v}` },
          { title: '岗位', dataIndex: 'jobTitle' },
          { title: '工时', render: (_, r) => `${r.actualHours}h（加班 ${r.overtimeHours}h）`, width: 130 },
          { title: '应发', render: (_, r) => fmtMoney(r.grossAmount), width: 100 },
          { title: '保费', render: (_, r) => `-${fmtMoney(r.insurancePremium)}`, width: 90 },
          { title: '实收', render: (_, r) => <b style={{ color: '#1677ff' }}>{fmtMoney(r.netAmount)}</b>, width: 100 },
          { title: '状态', render: (_, r) => <StatusTag map={SETTLEMENT_STATUS} value={r.status} />, width: 110 },
          {
            title: '操作',
            width: 180,
            render: (_, r) => (
              <>
                <Button size="small" type="link" onClick={() => navigate(`/tasks/${r.taskId}`)}>
                  明细
                </Button>
                {r.status === 'pending' && (
                  <Button size="small" danger onClick={() => setAppealing(r)}>
                    申诉
                  </Button>
                )}
              </>
            ),
          },
        ]}
      />
      <Modal
        title={`申诉结算单 #${appealing?.id}`}
        open={!!appealing}
        onOk={submitAppeal}
        onCancel={() => setAppealing(null)}
        okText="提交申诉"
      >
        {appealing && (
          <div style={{ marginBottom: 12, color: '#888', fontSize: 13 }}>
            应发 {fmtMoney(appealing.grossAmount)}，扣款 {fmtMoney(Number(appealing.lateDeduction) + Number(appealing.otherDeductions))}
            {appealing.deductionReason && <Tag color="volcano" style={{ marginLeft: 8 }}>{appealing.deductionReason}</Tag>}
          </div>
        )}
        <Input.TextArea
          rows={3}
          placeholder="申诉原因（至少 5 字），客服将结合签到轨迹、主管确认、现场照片与聊天记录裁决"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div style={{ marginTop: 12 }}>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>上传现场照片证据</Button>
          </Upload>
          {evidence.map((url) => (
            <img key={url} src={url} style={{ width: 80, marginTop: 8, marginRight: 8, borderRadius: 4 }} />
          ))}
        </div>
      </Modal>
    </Card>
  );
}
