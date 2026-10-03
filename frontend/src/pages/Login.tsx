import { useState } from 'react';
import { useAuth } from '../auth';
import { Field, Alert } from '../components/ui';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'WORKER' | 'ENTERPRISE'>('WORKER');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({
    username: '', password: '', name: '', phone: '',
    idCardNo: '', healthCertUntil: '', enterpriseName: '',
  });
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const quick = [
    { label: '工人 张三', u: 'worker1' },
    { label: '企业 刘经理', u: 'enterprise1' },
    { label: '现场主管 王主管', u: 'supervisor1' },
    { label: '高风险企业 钱总', u: 'enterprise_risky' },
    { label: '平台客服', u: 'support' },
  ];

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.username, form.password);
      } else {
        await register({
          username: form.username, password: form.password,
          name: form.name || form.username, phone: form.phone || '13800000000',
          role,
          idCardNo: role === 'WORKER' ? form.idCardNo : undefined,
          healthCertUntil: role === 'WORKER' ? form.healthCertUntil || undefined : undefined,
          enterpriseName: role === 'ENTERPRISE' ? form.enterpriseName : undefined,
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-hero">
          <div className="brand-name" style={{ color: '#fff', fontSize: 22, marginBottom: 18 }}>零工邦<span className="dot">·</span></div>
          <h1>城市临时用工<br />日结派单 · 考勤 · 保险 · 争议平台</h1>
          <ul className="small" style={{ paddingLeft: 18, lineHeight: 2, opacity: .92 }}>
            <li>商超盘点 / 会展搭建 / 仓库分拣 / 餐饮帮工 / 保洁突击 / 活动安保</li>
            <li>到岗四重校验：定位 + 人脸 + 主管确认 + 动态二维码</li>
            <li>保险锚定实际到岗时间生效，事故后不可补录</li>
            <li>日结明细：工时 / 加班 / 迟到 / 餐补 / 扣款 / 预付 / 服务费</li>
            <li>申诉证据链 + 客服补发/维持/仲裁 + 企业风险画像</li>
          </ul>
        </div>
        <div className="login-body">
          <div className="tabs" style={{ marginBottom: 18 }}>
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>登录</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>注册</button>
          </div>

          {mode === 'register' && (
            <div className="role-switch">
              <button className={role === 'WORKER' ? 'active' : ''} onClick={() => setRole('WORKER')}>👷 我是工人</button>
              <button className={role === 'ENTERPRISE' ? 'active' : ''} onClick={() => setRole('ENTERPRISE')}>🏢 我是企业</button>
            </div>
          )}

          {error && <Alert kind="error">{error}</Alert>}

          <Field label="用户名">
            <input className="input" value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="登录用户名" />
          </Field>
          <Field label="密码（至少 6 位）">
            <input className="input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="密码" />
          </Field>

          {mode === 'register' && (
            <>
              <Field label="姓名 / 联系人">
                <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="手机号">
                <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              {role === 'WORKER' ? (
                <div className="grid grid-2">
                  <Field label="身份证号（实名）">
                    <input className="input" value={form.idCardNo} onChange={(e) => set('idCardNo', e.target.value)} placeholder="选填，可稍后补全" />
                  </Field>
                  <Field label="健康证有效期至">
                    <input className="input" type="date" value={form.healthCertUntil} onChange={(e) => set('healthCertUntil', e.target.value)} />
                  </Field>
                </div>
              ) : (
                <Field label="企业名称">
                  <input className="input" value={form.enterpriseName} onChange={(e) => set('enterpriseName', e.target.value)} />
                </Field>
              )}
            </>
          )}

          <button className="btn btn-primary btn-block" disabled={busy} onClick={submit}>
            {busy ? '处理中…' : mode === 'login' ? '登录' : '注册并登录'}
          </button>

          {mode === 'login' && (
            <div style={{ marginTop: 18 }}>
              <div className="small muted" style={{ marginBottom: 6 }}>演示账号一键填充（密码均为 123456）：</div>
              <div className="row">
                {quick.map((q) => (
                  <button key={q.u} className="btn btn-sm" onClick={() => { setForm((f: any) => ({ ...f, username: q.u, password: '123456' })); }}>
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
