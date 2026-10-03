import React, { useState } from 'react';
import { Button, Card, Form, Input, Radio, Tabs, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';

const TEST_ACCOUNTS = [
  { role: '工人(已实名)', phone: '13900000001', pwd: '123456' },
  { role: '工人(未实名)', phone: '13900000003', pwd: '123456' },
  { role: '企业(低风险)', phone: '13800000001', pwd: '123456' },
  { role: '企业(高风险)', phone: '13800000002', pwd: '123456' },
  { role: '现场主管', phone: '13800000011', pwd: '123456' },
  { role: '平台客服', phone: '19900000001', pwd: 'admin123' },
];

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);

  const doLogin = async (values: any) => {
    setLoading(true);
    try {
      const data: any = await api.post('/auth/login', values);
      localStorage.setItem('token', data.token);
      await refresh();
      message.success('登录成功');
      navigate('/');
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async (values: any) => {
    setLoading(true);
    try {
      const data: any = await api.post('/auth/register', values);
      localStorage.setItem('token', data.token);
      await refresh();
      message.success('注册成功');
      navigate('/');
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        padding: 20,
      }}
    >
      <Card style={{ width: 460, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 4 }}>城市临时用工日结平台</h2>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: 20 }}>
          派单 · 考勤 · 保险 · 日结 · 争议仲裁
        </p>
        <Tabs
          centered
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form layout="vertical" onFinish={doLogin}>
                  <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
                    <Input placeholder="11 位手机号" maxLength={11} />
                  </Form.Item>
                  <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password placeholder="密码" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>
                    登录
                  </Button>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form layout="vertical" onFinish={doRegister} initialValues={{ role: 'worker' }}>
                  <Form.Item name="role" label="注册身份">
                    <Radio.Group
                      options={[
                        { label: '工人', value: 'worker' },
                        { label: '企业', value: 'enterprise' },
                      ]}
                      optionType="button"
                      buttonStyle="solid"
                    />
                  </Form.Item>
                  <Form.Item name="name" label="姓名 / 企业简称" rules={[{ required: true, message: '请输入名称' }]}>
                    <Input placeholder="姓名或企业简称" />
                  </Form.Item>
                  <Form.Item name="phone" label="手机号" rules={[{ required: true, len: 11, message: '请输入 11 位手机号' }]}>
                    <Input placeholder="11 位手机号" maxLength={11} />
                  </Form.Item>
                  <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: '密码至少 6 位' }]}>
                    <Input.Password placeholder="至少 6 位" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>
                    注册并登录
                  </Button>
                </Form>
              ),
            },
          ]}
        />
        <Card size="small" title="演示账号（点击填充）" style={{ marginTop: 16, background: '#fafafa' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TEST_ACCOUNTS.map((a) => (
              <Button
                key={a.phone}
                size="small"
                onClick={() => doLogin({ phone: a.phone, password: a.pwd })}
              >
                {a.role}
              </Button>
            ))}
          </div>
        </Card>
      </Card>
    </div>
  );
}
