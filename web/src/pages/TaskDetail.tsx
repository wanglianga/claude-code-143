import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Rate,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Timeline,
  Upload,
  message,
} from 'antd';
import { CameraOutlined, EnvironmentOutlined, QrcodeOutlined, UploadOutlined } from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';
import {
  EVENT_TYPES,
  fmtFullTime,
  fmtMoney,
  fmtTime,
  INSURANCE_STATUS,
  SETTLEMENT_STATUS,
  StatusTag,
  TASK_STATUS,
} from '../helpers';

const EVENT_FORM_FIELDS: Record<string, { name: string; label: string; type: 'number' | 'text' | 'textarea' }[]> = {
  overtime: [{ name: 'hours', label: '加班时长（小时）', type: 'number' }],
  position_swap: [
    { name: 'from', label: '原岗位', type: 'text' },
    { name: 'to', label: '调换后岗位', type: 'text' },
  ],
  early_leave: [{ name: 'minutes', label: '早退时长（分钟）', type: 'number' }],
  extra_work: [
    { name: 'description', label: '额外工作内容（如额外搬运）', type: 'textarea' },
    { name: 'amount', label: '协商补贴金额（元，可选）', type: 'number' },
  ],
  injury: [{ name: 'description', label: '受伤情况描述', type: 'textarea' }],
  deduction: [
    { name: 'amount', label: '扣款金额（元）', type: 'number' },
    { name: 'reason', label: '扣款原因', type: 'text' },
  ],
  note: [{ name: 'text', label: '备注内容', type: 'textarea' }],
};

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [qrInfo, setQrInfo] = useState<any>(null);
  const [checkInForm] = Form.useForm();
  const [eventModal, setEventModal] = useState<string | null>(null);
  const [eventForm] = Form.useForm();
  const [chatText, setChatText] = useState('');
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewForm] = Form.useForm();
  const [appealModal, setAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [faceImage, setFaceImage] = useState('');

  const load = async () => {
    const d: any = await api.get(`/tasks/${id}`);
    setData(d);
    if (['enterprise', 'supervisor'].includes(user.role)) {
      try {
        const q: any = await api.get(`/tasks/${id}/qrcode`);
        setQrInfo(q);
      } catch {
        /* 无权限时忽略 */
      }
    }
  };
  useEffect(() => {
    load();
  }, [id]);

  if (!data) return null;
  const { task, job, attendance, insurance, events, settlement, chats, reviews, worker, enterprise } = data;

  // ---------- 考勤操作 ----------
  const fillGeo = () => {
    // 演示：以岗位坐标 ±50m 抖动模拟现场定位
    const jitter = () => (Math.random() - 0.5) * 0.0008;
    checkInForm.setFieldsValue({
      lat: Number(job.lat) + jitter(),
      lng: Number(job.lng) + jitter(),
    });
    message.success('已获取现场定位（演示模拟 GPS）');
  };

  const mockFace = () => {
    setFaceImage(`face_${Date.now()}`);
    message.success('人脸采集成功，活体比对通过（演示模拟）');
  };

  const doCheckIn = async (values: any) => {
    try {
      const res: any = await api.post(`/tasks/${task.id}/check-in`, { ...values, faceImage });
      message.success(res.message || '签到成功');
      load();
    } catch {
      /* 已提示 */
    }
  };

  const doCheckOut = async () => {
    try {
      const res: any = await api.post(`/tasks/${task.id}/check-out`, {
        lat: Number(job.lat),
        lng: Number(job.lng),
      });
      message.success(res.message || '签退成功');
      load();
    } catch {
      /* 已提示 */
    }
  };

  const confirmAttendance = async () => {
    try {
      const res: any = await api.post(`/tasks/${task.id}/confirm-attendance`);
      message.success(res.message || '已确认');
      load();
    } catch {
      /* 已提示 */
    }
  };

  // ---------- 事件 ----------
  const submitEvent = async (values: any) => {
    try {
      await api.post(`/tasks/${task.id}/events`, { type: eventModal, payload: values });
      message.success('事件已上报并写入任务档案');
      setEventModal(null);
      eventForm.resetFields();
      load();
    } catch {
      /* 已提示 */
    }
  };

  // ---------- 结算 ----------
  const pay = async () => {
    try {
      await api.post(`/settlements/${settlement.id}/pay`);
      message.success('已支付，工人实时到账');
      load();
    } catch {
      /* 已提示 */
    }
  };

  const submitAppeal = async () => {
    try {
      await api.post(`/settlements/${settlement.id}/appeal`, { reason: appealReason, evidence: [] });
      message.success('申诉已提交');
      setAppealModal(false);
      load();
    } catch {
      /* 已提示 */
    }
  };

  // ---------- 聊天 / 评价 ----------
  const sendChat = async () => {
    if (!chatText.trim()) return;
    await api.post(`/tasks/${task.id}/chat`, { content: chatText });
    setChatText('');
    load();
  };

  const submitReview = async (values: any) => {
    try {
      await api.post(`/tasks/${task.id}/review`, values);
      message.success('评价成功');
      setReviewModal(false);
      load();
    } catch {
      /* 已提示 */
    }
  };

  const canWorkerAct = user.role === 'worker' && task.workerId === user.id;
  const canEnterpriseAct =
    (user.role === 'enterprise' && task.enterpriseId === user.id) ||
    (user.role === 'supervisor' && user.enterpriseId === task.enterpriseId);
  const myReviewed = reviews?.some((r: any) => r.fromUserId === user.id);

  const eventOptions =
    user.role === 'worker'
      ? [
          { label: '工人早退', value: 'early_leave' },
          { label: '工人受伤', value: 'injury' },
          { label: '备注', value: 'note' },
        ]
      : user.role === 'enterprise'
        ? [
            { label: '临时加班', value: 'overtime' },
            { label: '岗位调换', value: 'position_swap' },
            { label: '工人早退', value: 'early_leave' },
            { label: '额外工作（搬运等）', value: 'extra_work' },
            { label: '工人受伤', value: 'injury' },
            { label: '工资扣款', value: 'deduction' },
            { label: '备注', value: 'note' },
          ]
        : [
            { label: '临时加班', value: 'overtime' },
            { label: '岗位调换', value: 'position_swap' },
            { label: '工人早退', value: 'early_leave' },
            { label: '额外工作（搬运等）', value: 'extra_work' },
            { label: '工人受伤', value: 'injury' },
            { label: '备注', value: 'note' },
          ];

  const stepCurrent =
    task.status === 'assigned' ? 0 : task.status === 'checked_in' ? 1 : task.status === 'confirmed' ? 2 : task.status === 'checked_out' ? 3 : task.status === 'settled' ? 4 : 0;

  return (
    <div>
      <Card
        title={
          <Space>
            任务 #{task.id} · {job.title}
            <StatusTag map={TASK_STATUS} value={task.status} />
          </Space>
        }
        extra={
          <Space>
            {task.status === 'settled' && !myReviewed && ['worker', 'enterprise'].includes(user.role) && (
              <Button onClick={() => setReviewModal(true)}>评价对方</Button>
            )}
          </Space>
        }
      >
        <Steps
          size="small"
          current={stepCurrent}
          status={task.status === 'cancelled' ? 'error' : stepCurrent === 4 ? 'finish' : 'process'}
          items={[
            { title: '已派单' },
            { title: '签到' },
            { title: '到岗确认' },
            { title: '签退' },
            { title: '日结完成' },
          ]}
          style={{ marginBottom: 20 }}
        />
        <Descriptions size="small" column={{ xs: 1, md: 3 }} bordered>
          <Descriptions.Item label="工人">{worker?.name}（{worker?.phone}）</Descriptions.Item>
          <Descriptions.Item label="企业">{enterprise?.name}</Descriptions.Item>
          <Descriptions.Item label="类目">{job.category}</Descriptions.Item>
          <Descriptions.Item label="地点">{job.location}</Descriptions.Item>
          <Descriptions.Item label="时间">{fmtTime(job.startTime)} ~ {fmtTime(job.endTime)}</Descriptions.Item>
          <Descriptions.Item label="工资">
            {fmtMoney(job.hourlyWage)}/h · 加班 {fmtMoney(job.overtimeWage || job.hourlyWage * 1.5)}/h · 餐补 {fmtMoney(job.mealAllowance)}
          </Descriptions.Item>
          <Descriptions.Item label="迟到规则">
            宽限 {job.lateGraceMinutes} 分钟，之后每分钟扣 {fmtMoney(job.lateDeductPerMinute)}
          </Descriptions.Item>
          <Descriptions.Item label="保险方案">{job.insurancePlan}</Descriptions.Item>
          <Descriptions.Item label="结算方式">日结（企业预付保证金）</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* ---------- 考勤 ---------- */}
        <Col xs={24} lg={12}>
          <Card title="考勤（定位 + 人脸 + 二维码 + 主管确认）" size="small">
            {attendance ? (
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="签到时间">{fmtFullTime(attendance.checkInTime)}</Descriptions.Item>
                <Descriptions.Item label="签到位置">
                  距岗位 {attendance.checkInDistance} 米
                  {attendance.geoVerified ? <Tag color="green" style={{ marginLeft: 6 }}>定位✓</Tag> : <Tag color="red">定位✗</Tag>}
                  {attendance.faceVerified && <Tag color="green">人脸✓</Tag>}
                  {attendance.qrVerified && <Tag color="green">二维码✓</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="主管确认">
                  {attendance.supervisorConfirmedAt
                    ? `${fmtFullTime(attendance.supervisorConfirmedAt)}`
                    : attendance.status === 'pending_confirm'
                      ? <Tag color="orange">待现场确认</Tag>
                      : '低风险岗位自动确认'}
                </Descriptions.Item>
                {attendance.lateMinutes > 0 && (
                  <Descriptions.Item label="迟到">
                    <Tag color="volcano">{attendance.lateMinutes} 分钟</Tag>
                  </Descriptions.Item>
                )}
                {attendance.checkOutTime && (
                  <Descriptions.Item label="签退">
                    {fmtFullTime(attendance.checkOutTime)} · 有效工时 {attendance.effectiveHours}h
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <p style={{ color: '#999' }}>尚未签到</p>
            )}

            {canWorkerAct && task.status === 'assigned' && (
              <Form form={checkInForm} layout="inline" onFinish={doCheckIn} style={{ marginTop: 16, rowGap: 8 }}>
                <Form.Item name="qrCode" rules={[{ required: true, message: '请输入签到码' }]}>
                  <Input placeholder="签到码（向主管索取）" style={{ width: 180 }} prefix={<QrcodeOutlined />} />
                </Form.Item>
                <Form.Item name="lat" rules={[{ required: true, message: '请获取定位' }]} style={{ display: 'none' }}>
                  <Input />
                </Form.Item>
                <Form.Item name="lng" style={{ display: 'none' }}>
                  <Input />
                </Form.Item>
                <Form.Item>
                  <Button icon={<EnvironmentOutlined />} onClick={fillGeo}>获取定位</Button>
                </Form.Item>
                <Form.Item>
                  <Button icon={<CameraOutlined />} onClick={mockFace} type={faceImage ? 'primary' : 'default'}>
                    {faceImage ? '人脸已采集✓' : '采集人脸'}
                  </Button>
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">签到</Button>
                </Form.Item>
              </Form>
            )}
            {canWorkerAct && ['confirmed', 'checked_in'].includes(task.status) && attendance?.status === 'confirmed' && (
              <Button type="primary" danger style={{ marginTop: 16 }} onClick={doCheckOut}>
                签退并生成日结单
              </Button>
            )}
            {canEnterpriseAct && attendance?.status === 'pending_confirm' && (
              <Alert
                style={{ marginTop: 16 }}
                type="warning"
                showIcon
                message="高风险岗位/企业：需现场确认到岗后，考勤与保险才生效"
                action={<Button size="small" type="primary" onClick={confirmAttendance}>确认到岗</Button>}
              />
            )}
            {canEnterpriseAct && qrInfo && ['assigned', 'checked_in'].includes(task.status) && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <QRCodeCanvas value={qrInfo.qrCode} size={110} />
                <div style={{ marginTop: 6 }}>
                  签到码：<b style={{ fontSize: 18, letterSpacing: 2 }}>{qrInfo.qrCode}</b>
                </div>
                <div style={{ color: '#999', fontSize: 12 }}>出示给工人扫码/输入完成签到</div>
              </div>
            )}
          </Card>
        </Col>

        {/* ---------- 保险 ---------- */}
        <Col xs={24} lg={12}>
          <Card title="保险（生效时间 = 实际到岗确认时间）" size="small">
            {insurance ? (
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="保单号">{insurance.policyNo}</Descriptions.Item>
                <Descriptions.Item label="方案 / 保费 / 保额">
                  {insurance.plan} · {fmtMoney(insurance.premium)} · {fmtMoney(insurance.coverageAmount)}
                </Descriptions.Item>
                <Descriptions.Item label="生效时间">{fmtFullTime(insurance.effectiveAt)}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <StatusTag map={INSURANCE_STATUS} value={insurance.status} />
                  {insurance.claimAmount > 0 && <Tag color="blue">赔付 {fmtMoney(insurance.claimAmount)}</Tag>}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Alert
                type={events?.some((e: any) => e.type === 'injury') ? 'error' : 'info'}
                showIcon
                message={
                  events?.some((e: any) => e.type === 'injury')
                    ? '该任务已发生受伤事件，保险不可事后补录'
                    : '到岗确认后自动签发保单，事故后不可补录'
                }
              />
            )}
          </Card>

          {/* ---------- 事件 ---------- */}
          <Card
            title="任务事件（加班/调岗/早退/额外工作/受伤/扣款）"
            size="small"
            style={{ marginTop: 16 }}
            extra={
              (canWorkerAct || canEnterpriseAct) && (
                <Select
                  size="small"
                  placeholder="上报事件"
                  style={{ width: 170 }}
                  value={null}
                  onChange={(v) => setEventModal(v)}
                  options={eventOptions}
                />
              )
            }
          >
            {events?.length ? (
              <Timeline
                items={events.map((e: any) => ({
                  color: e.type === 'injury' || e.type === 'deduction' ? 'red' : 'blue',
                  children: (
                    <div>
                      <Space>
                        <Tag color={EVENT_TYPES[e.type]?.color}>{EVENT_TYPES[e.type]?.text || e.type}</Tag>
                        <span style={{ color: '#999', fontSize: 12 }}>{fmtFullTime(e.createdAt)} · {e.reportedByRole}</span>
                      </Space>
                      <div style={{ fontSize: 13, marginTop: 2 }}>
                        {Object.entries(e.payload || {}).map(([k, v]) => (
                          <div key={k}>{k}: {String(v)}</div>
                        ))}
                      </div>
                    </div>
                  ),
                }))}
              />
            ) : (
              <p style={{ color: '#999' }}>暂无事件</p>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* ---------- 结算 ---------- */}
        <Col xs={24} lg={12}>
          <Card
            title="日结结算单"
            size="small"
            extra={settlement && <StatusTag map={SETTLEMENT_STATUS} value={settlement.status} />}
          >
            {settlement ? (
              <>
                <Table
                  size="small"
                  rowKey={(r: any) => r.label}
                  pagination={false}
                  dataSource={settlement.items || []}
                  columns={[
                    { title: '项目', dataIndex: 'label' },
                    {
                      title: '金额',
                      dataIndex: 'amount',
                      align: 'right' as const,
                      render: (v: number) => (
                        <span style={{ color: v < 0 ? '#cf1322' : undefined, fontWeight: Math.abs(v) >= 100 ? 600 : 400 }}>
                          {v < 0 ? '-' : ''}{fmtMoney(Math.abs(v))}
                        </span>
                      ),
                    },
                  ]}
                />
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  {user.role === 'enterprise' && settlement.status === 'pending' && (
                    <Button type="primary" onClick={pay}>
                      确认并支付（保证金划扣 {fmtMoney(Number(settlement.grossAmount) + Number(settlement.platformFee))}）
                    </Button>
                  )}
                  {canWorkerAct && settlement.status === 'pending' && (
                    <Button danger onClick={() => setAppealModal(true)}>对结算有异议？申诉</Button>
                  )}
                </div>
              </>
            ) : (
              <p style={{ color: '#999' }}>签退后自动生成结算单</p>
            )}
          </Card>
        </Col>

        {/* ---------- 沟通记录 ---------- */}
        <Col xs={24} lg={12}>
          <Card title="沟通记录（争议取证留痕）" size="small">
            <div style={{ maxHeight: 220, overflow: 'auto', marginBottom: 12 }}>
              <List
                size="small"
                dataSource={chats || []}
                locale={{ emptyText: '暂无沟通记录' }}
                renderItem={(c: any) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <span>
                      <Tag>{c.senderName}</Tag>
                      {c.content}
                      <span style={{ color: '#bbb', fontSize: 11, marginLeft: 8 }}>{fmtFullTime(c.createdAt)}</span>
                    </span>
                  </List.Item>
                )}
              />
            </div>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="输入消息..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onPressEnter={sendChat}
              />
              <Button type="primary" onClick={sendChat}>发送</Button>
            </Space.Compact>
          </Card>

          {/* ---------- 评价 ---------- */}
          {reviews?.length > 0 && (
            <Card title="双方评价" size="small" style={{ marginTop: 16 }}>
              {reviews.map((r: any) => (
                <div key={r.id} style={{ marginBottom: 8 }}>
                  <Rate value={r.rating} disabled style={{ fontSize: 14 }} />
                  <span style={{ marginLeft: 8 }}>{r.comment}</span>
                  <span style={{ color: '#bbb', fontSize: 11, marginLeft: 8 }}>
                    {r.fromUserId === task.workerId ? '工人评企业' : '企业评工人'}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </Col>
      </Row>

      {/* 事件上报弹窗 */}
      <Modal
        title={`上报事件：${EVENT_TYPES[eventModal || '']?.text || ''}`}
        open={!!eventModal}
        onCancel={() => setEventModal(null)}
        onOk={() => eventForm.submit()}
        okText="提交"
        destroyOnClose
      >
        <Form form={eventForm} layout="vertical" onFinish={submitEvent}>
          {(EVENT_FORM_FIELDS[eventModal || ''] || []).map((f) => (
            <Form.Item key={f.name} name={f.name} label={f.label} rules={[{ required: f.type !== 'textarea' || eventModal === 'injury', message: '请填写' }]}>
              {f.type === 'number' ? (
                <InputNumber style={{ width: '100%' }} min={0} step={0.5} />
              ) : f.type === 'textarea' ? (
                <Input.TextArea rows={3} />
              ) : (
                <Input />
              )}
            </Form.Item>
          ))}
          {eventModal === 'deduction' && (
            <Alert type="warning" showIcon message="扣款将计入结算明细，工人可就此发起申诉" />
          )}
          {eventModal === 'injury' && (
            <Alert type="error" showIcon message="上报受伤后，该任务不可再补录保险；如有生效保单可申请理赔" />
          )}
        </Form>
      </Modal>

      {/* 申诉弹窗 */}
      <Modal
        title="发起申诉"
        open={appealModal}
        onCancel={() => setAppealModal(false)}
        onOk={submitAppeal}
        okText="提交申诉"
      >
        <p style={{ color: '#888', fontSize: 13 }}>
          客服将查看签到轨迹、主管确认记录、现场照片与聊天记录，决定补发、维持扣款或升级仲裁。
        </p>
        <Input.TextArea
          rows={4}
          placeholder="申诉原因（至少 5 字）"
          value={appealReason}
          onChange={(e) => setAppealReason(e.target.value)}
        />
      </Modal>

      {/* 评价弹窗 */}
      <Modal title="评价对方" open={reviewModal} onCancel={() => setReviewModal(false)} onOk={() => reviewForm.submit()} okText="提交">
        <Form form={reviewForm} layout="vertical" onFinish={submitReview}>
          <Form.Item name="rating" label="评分" rules={[{ required: true, message: '请评分' }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="评价内容">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
