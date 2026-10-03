import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Spin, Tag } from 'antd';
import { useAuth } from './auth';
import Login from './pages/Login';
import JobMarket from './pages/worker/JobMarket';
import WorkerProfile from './pages/worker/Profile';
import MyApplications from './pages/worker/MyApplications';
import MyTasks from './pages/worker/MyTasks';
import MyInsurance from './pages/worker/MyInsurance';
import MySettlements from './pages/worker/MySettlements';
import TaskDetail from './pages/TaskDetail';
import EntDashboard from './pages/enterprise/Dashboard';
import EntJobs from './pages/enterprise/Jobs';
import EntJobForm from './pages/enterprise/JobForm';
import EntJobDetail from './pages/enterprise/JobDetail';
import EntSettlements from './pages/enterprise/Settlements';
import EntSupervisors from './pages/enterprise/Supervisors';
import SupTasks from './pages/supervisor/Tasks';
import AdminAppeals from './pages/admin/Appeals';
import AdminRisk from './pages/admin/Risk';

const { Header, Sider, Content } = Layout;

const ROLE_NAMES: Record<string, string> = {
  worker: '工人',
  enterprise: '企业',
  supervisor: '现场主管',
  admin: '平台客服',
};

const MENUS: Record<string, { key: string; label: string }[]> = {
  worker: [
    { key: '/jobs', label: '岗位市场' },
    { key: '/my/applications', label: '我的报名' },
    { key: '/my/tasks', label: '我的任务' },
    { key: '/my/insurance', label: '我的保单' },
    { key: '/my/settlements', label: '我的结算' },
    { key: '/worker/profile', label: '我的档案' },
  ],
  enterprise: [
    { key: '/ent/dashboard', label: '工作台' },
    { key: '/ent/jobs', label: '岗位管理' },
    { key: '/ent/jobs/new', label: '发布岗位' },
    { key: '/ent/settlements', label: '结算管理' },
    { key: '/ent/supervisors', label: '主管账号' },
  ],
  supervisor: [{ key: '/sup/tasks', label: '现场任务' }],
  admin: [
    { key: '/admin/appeals', label: '申诉工单' },
    { key: '/admin/risk', label: '风险看板' },
  ],
};

const HOME: Record<string, string> = {
  worker: '/jobs',
  enterprise: '/ent/dashboard',
  supervisor: '/sup/tasks',
  admin: '/admin/appeals',
};

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menus = MENUS[user.role] || [];
  const selected =
    menus.find((m) => location.pathname.startsWith(m.key))?.key || menus[0]?.key;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#001529',
        }}
      >
        <div style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>
          城市临时用工日结平台
          <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 10, opacity: 0.7 }}>
            派单 · 考勤 · 保险 · 日结 · 争议仲裁
          </span>
        </div>
        <div style={{ color: '#fff' }}>
          <Tag color="blue">{ROLE_NAMES[user.role]}</Tag>
          <span style={{ marginRight: 16 }}>{user.name}</span>
          <a style={{ color: '#91caff' }} onClick={logout}>
            退出登录
          </a>
        </div>
      </Header>
      <Layout>
        <Sider width={180} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[selected]}
            items={menus}
            onClick={(e) => navigate(e.key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Content style={{ padding: 20, background: '#f5f7fa', overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 200 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={HOME[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/jobs" element={<Guard><JobMarket /></Guard>} />
        <Route path="/worker/profile" element={<Guard><WorkerProfile /></Guard>} />
        <Route path="/my/applications" element={<Guard><MyApplications /></Guard>} />
        <Route path="/my/tasks" element={<Guard><MyTasks /></Guard>} />
        <Route path="/my/insurance" element={<Guard><MyInsurance /></Guard>} />
        <Route path="/my/settlements" element={<Guard><MySettlements /></Guard>} />
        <Route path="/tasks/:id" element={<Guard><TaskDetail /></Guard>} />
        <Route path="/ent/dashboard" element={<Guard><EntDashboard /></Guard>} />
        <Route path="/ent/jobs" element={<Guard><EntJobs /></Guard>} />
        <Route path="/ent/jobs/new" element={<Guard><EntJobForm /></Guard>} />
        <Route path="/ent/jobs/:id/edit" element={<Guard><EntJobForm /></Guard>} />
        <Route path="/ent/jobs/:id" element={<Guard><EntJobDetail /></Guard>} />
        <Route path="/ent/settlements" element={<Guard><EntSettlements /></Guard>} />
        <Route path="/ent/supervisors" element={<Guard><EntSupervisors /></Guard>} />
        <Route path="/sup/tasks" element={<Guard><SupTasks /></Guard>} />
        <Route path="/admin/appeals" element={<Guard><AdminAppeals /></Guard>} />
        <Route path="/admin/risk" element={<Guard><AdminRisk /></Guard>} />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
