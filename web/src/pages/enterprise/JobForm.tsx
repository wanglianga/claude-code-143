import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { fmtMoney, RISK_LEVEL } from '../../helpers';

const CATEGORIES = ['商超盘点', '会展搭建', '仓库分拣', '餐饮帮工', '保洁突击', '活动安保'];
const SKILLS = ['盘点', '分拣', '搬运', '搭建', '餐饮', '保洁', '安保', '收银'];

export default function EntJobForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const [form] = Form.useForm();
  const [plans, setPlans] = useState<any>({});
  const [preview, setPreview] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/jobs/insurance-plans').then((d: any) => setPlans(d));
    if (isEdit) {
      api.get(`/jobs/${id}`).then((job: any) => {
        form.setFieldsValue({
          ...job,
          time: [dayjs(job.startTime), dayjs(job.endTime)],
        });
      });
    }
  }, [id]);

  const values2dto = (v: any) => ({
    title: v.title,
    category: v.category,
    description: v.description || '',
    location: v.location,
    lat: v.lat ?? 31.2304,
    lng: v.lng ?? 121.4737,
    startTime: v.time?.[0]?.toISOString(),
    endTime: v.time?.[1]?.toISOString(),
    headcount: v.headcount,
    skillRequirements: v.skillRequirements || [],
    healthCertRequired: !!v.healthCertRequired,
    clothingRequirements: v.clothingRequirements || '',
    hourlyWage: v.hourlyWage,
    overtimeWage: v.overtimeWage || 0,
    mealAllowance: v.mealAllowance || 0,
    lateDeductPerMinute: v.lateDeductPerMinute || 0,
    lateGraceMinutes: v.lateGraceMinutes ?? 10,
    insurancePlan: v.insurancePlan,
    riskLevel: v.riskLevel,
    settlementType: 'daily',
  });

  const refreshPreview = async () => {
    try {
      const v = await form.validateFields();
      const p: any = await api.post('/jobs/deposit-preview', values2dto(v));
      setPreview(p);
    } catch {
      /* 表单未填完 */
    }
  };

  const save = async (publish: boolean) => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      let jobId = id;
      if (isEdit) {
        await api.put(`/jobs/${id}`, values2dto(v));
      } else {
        const job: any = await api.post('/jobs', values2dto(v));
        jobId = job.id;
      }
      if (publish) {
        await api.post(`/jobs/${jobId}/publish`);
        message.success('岗位已发布，保证金已冻结');
      } else {
        message.success('草稿已保存');
      }
      navigate('/ent/jobs');
    } catch {
      /* 已提示 */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={isEdit ? '编辑岗位（草稿）' : '发布岗位'}>
      <Row gutter={24}>
        <Col xs={24} lg={15}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              category: '商超盘点',
              headcount: 2,
              hourlyWage: 25,
              overtimeWage: 0,
              mealAllowance: 20,
              lateDeductPerMinute: 0.5,
              lateGraceMinutes: 10,
              insurancePlan: 'standard',
              riskLevel: 'low',
              lat: 31.2304,
              lng: 121.4737,
              healthCertRequired: false,
            }}
            onValuesChange={() => {
              /* 手动触发试算 */
            }}
          >
            <Form.Item name="title" label="岗位标题" rules={[{ required: true, message: '请输入标题' }]}>
              <Input placeholder="如：周末门店大盘点" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item name="category" label="岗位类目" rules={[{ required: true }]}>
                  <Select options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="riskLevel" label="岗位风险等级" rules={[{ required: true }]}>
                  <Select
                    options={Object.entries(RISK_LEVEL).map(([v, r]) => ({ label: r.text, value: v }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="headcount" label="招聘人数" rules={[{ required: true }]}>
                  <InputNumber min={1} max={200} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="岗位描述">
              <Input.TextArea rows={2} placeholder="工作内容、注意事项" />
            </Form.Item>
            <Form.Item name="location" label="工作地点" rules={[{ required: true, message: '请输入地点' }]}>
              <Input placeholder="详细地址（签到将校验 500 米地理围栏）" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="lat" label="纬度" rules={[{ required: true }]}>
                  <InputNumber step={0.0001} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lng" label="经度" rules={[{ required: true }]}>
                  <InputNumber step={0.0001} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="time" label="工作起止时间" rules={[{ required: true, message: '请选择时间' }]}>
              <DatePicker.RangePicker showTime={{ format: 'HH:mm' }} style={{ width: '100%' }} />
            </Form.Item>
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item name="hourlyWage" label="时薪（元/小时）" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="overtimeWage" label="加班时薪（元/小时，0=1.5倍）">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="mealAllowance" label="餐补（元/天）">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="lateDeductPerMinute" label="迟到扣款（元/分钟）">
                  <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lateGraceMinutes" label="迟到宽限（分钟）">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="skillRequirements" label="技能要求">
                  <Select mode="multiple" options={SKILLS.map((s) => ({ label: s, value: s }))} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="healthCertRequired" label="需健康证" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="clothingRequirements" label="服装要求">
                  <Input placeholder="如：深色便装" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="insurancePlan" label="意外保险方案（保费工人承担，结算时扣除）" rules={[{ required: true }]}>
              <Select
                options={Object.entries(plans).map(([k, p]: any) => ({
                  label: `${p.name}：保费 ¥${p.premium}/天，保额 ¥${p.coverage.toLocaleString()}`,
                  value: k,
                }))}
              />
            </Form.Item>
            <Button type="primary" onClick={() => save(true)} loading={saving} style={{ marginRight: 12 }}>
              发布岗位（冻结保证金）
            </Button>
            <Button onClick={() => save(false)} loading={saving}>保存草稿</Button>
          </Form>
        </Col>
        <Col xs={24} lg={9}>
          <Card size="small" title="保证金试算（按企业风险倍率）" extra={<Button size="small" onClick={refreshPreview}>试算</Button>}>
            {preview ? (
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="单人预估成本">{fmtMoney(preview.perWorkerEstimate)}</Descriptions.Item>
                <Descriptions.Item label="招聘人数">{preview.headcount} 人</Descriptions.Item>
                <Descriptions.Item label="企业风险">
                  <span style={{ color: RISK_LEVEL[preview.riskLevel]?.color }}>
                    {RISK_LEVEL[preview.riskLevel]?.text}（倍率 ×{preview.multiplier}）
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="需冻结保证金">
                  <b style={{ color: '#1677ff', fontSize: 18 }}>{fmtMoney(preview.requiredDeposit)}</b>
                </Descriptions.Item>
                <Descriptions.Item label="当前可用余额">{fmtMoney(preview.availableBalance)}</Descriptions.Item>
              </Descriptions>
            ) : (
              <p style={{ color: '#999' }}>填写岗位信息后点击「试算」查看需冻结的保证金</p>
            )}
            <Alert
              style={{ marginTop: 12 }}
              type="info"
              showIcon
              message="冻结保证金 = 单人预估成本 × 人数 × 风险倍率，作为工人日结工资的预付保障；完工结算后剩余部分自动退回。"
            />
          </Card>
        </Col>
      </Row>
    </Card>
  );
}
