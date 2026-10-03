import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Table, message } from 'antd';
import api from '../../api';

export default function EntSupervisors() {
  const [list, setList] = useState<any[]>([]);
  const [form] = Form.useForm();

  const load = async () => {
    const data: any = await api.get('/enterprise/supervisors');
    setList(data);
  };
  useEffect(() => {
    load();
  }, []);

  const create = async (values: any) => {
    try {
      await api.post('/enterprise/supervisors', values);
      message.success('主管账号已创建');
      form.resetFields();
      load();
    } catch {
      /* 已提示 */
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <Card title="创建现场主管账号（主管负责现场确认到岗、上报现场事件）" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={create} style={{ rowGap: 8 }}>
          <Form.Item name="name" rules={[{ required: true, message: '姓名' }]}>
            <Input placeholder="主管姓名" />
          </Form.Item>
          <Form.Item name="phone" rules={[{ required: true, len: 11, message: '11 位手机号' }]}>
            <Input placeholder="手机号" maxLength={11} />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, min: 6, message: '至少 6 位' }]}>
            <Input.Password placeholder="初始密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit">创建</Button>
        </Form>
      </Card>
      <Card title="主管列表" size="small">
        <Table
          rowKey="id"
          size="small"
          dataSource={list}
          pagination={false}
          columns={[
            { title: '姓名', dataIndex: 'name' },
            { title: '手机号', dataIndex: 'phone' },
            { title: '创建时间', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleString('zh-CN') },
          ]}
        />
      </Card>
    </div>
  );
}
