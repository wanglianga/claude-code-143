import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Input, Row, Select, Space, Tag, message } from 'antd';
import api from '../../api';
import { fmtMoney, fmtTime, JOB_STATUS, StatusTag } from '../../helpers';
import { useAuth } from '../../auth';

export default function JobMarket() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>();
  const [keyword, setKeyword] = useState('');
  const { workerProfile } = useAuth();

  const load = async () => {
    const params: any = {};
    if (category) params.category = category;
    if (keyword) params.keyword = keyword;
    const data: any = await api.get('/jobs', { params });
    setJobs(data);
  };

  useEffect(() => {
    api.get('/jobs/categories').then((d: any) => setCategories(d));
  }, []);
  useEffect(() => {
    load();
  }, [category]);

  const apply = async (job: any) => {
    try {
      await api.post(`/jobs/${job.id}/apply`);
      message.success('报名成功，等待企业审核');
      load();
    } catch {
      /* 已提示 */
    }
  };

  return (
    <div>
      <Card
        title="岗位市场"
        extra={
          <Space>
            <Select
              allowClear
              placeholder="岗位类目"
              style={{ width: 150 }}
              value={category}
              onChange={setCategory}
              options={categories.map((c) => ({ label: c, value: c }))}
            />
            <Input.Search
              placeholder="搜索岗位"
              style={{ width: 200 }}
              onSearch={(v) => {
                setKeyword(v);
                setTimeout(load, 0);
              }}
            />
          </Space>
        }
      >
        {!workerProfile?.realNameVerified && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8 }}>
            您还未完成实名认证与风险告知书签署，报名前请先到「我的档案」完善资料。
          </div>
        )}
        {jobs.length === 0 && <Empty description="暂无岗位" />}
        <Row gutter={[16, 16]}>
          {jobs.map((job) => (
            <Col xs={24} md={12} xl={8} key={job.id}>
              <Card
                size="small"
                title={
                  <Space>
                    {job.title}
                    <StatusTag map={JOB_STATUS} value={job.status} />
                  </Space>
                }
                extra={
                  <Button type="primary" size="small" disabled={job.remaining <= 0} onClick={() => apply(job)}>
                    {job.remaining <= 0 ? '已招满' : '立即报名'}
                  </Button>
                }
              >
                <p><Tag>{job.category}</Tag><Tag color="blue">{job.settlementType === 'daily' ? '日结' : job.settlementType}</Tag>{job.healthCertRequired && <Tag color="volcano">需健康证</Tag>}</p>
                <p>📍 {job.location}</p>
                <p>🕐 {fmtTime(job.startTime)} ~ {fmtTime(job.endTime)}</p>
                <p>
                  💰 {fmtMoney(job.hourlyWage)}/小时 · 加班 {fmtMoney(job.overtimeWage || job.hourlyWage * 1.5)}/小时 · 餐补 {fmtMoney(job.mealAllowance)}
                </p>
                <p>👥 招 {job.headcount} 人，剩余 {job.remaining} 名额</p>
                <p style={{ color: '#888', fontSize: 12 }}>
                  技能：{job.skillRequirements?.join('、') || '不限'} · 服装：{job.clothingRequirements || '不限'} · 保险：{job.insurancePlan}
                </p>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
