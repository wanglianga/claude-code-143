import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../../api';
import { Alert, Badge, Field } from '../../components/ui';
import { INDUSTRIES } from '../industry';

function localInput(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostJob() {
  const nav = useNavigate();
  const [ent, setEnt] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<any>({
    title: '', industry: 'WAREHOUSE', description: '', location: '',
    lat: 31.2304, lng: 121.4737,
    startTime: localInput(new Date(Date.now() + 86400000)),
    endTime: localInput(new Date(Date.now() + 86400000 + 8 * 3600000)),
    headcount: 2, skillRequirement: '', dressCode: '',
    dailyWage: 260, overtimeRate: 30, mealAllowance: 20,
    lateDeductPerMin: 2, lateGraceMinutes: 5,
    insuranceCoverageWan: 30, settlementMethod: '日结-完工24小时内',
  });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => { get('/enterprise/home').then((d) => setEnt(d.enterprise)); }, []);

  const industry = INDUSTRIES[f.industry];
  const multiplier = ent ? 1 + (ent.riskLevel - 1) * 0.5 : 1;
  const depositPreview = Math.round((industry?.baseDeposit || 0) * multiplier * Number(f.headcount || 0));
  const premiumPreview = Math.round(Number(f.dailyWage || 0) * (industry?.insuranceRate || 0) * 100) / 100;

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      const job = await post('/jobs', {
        ...f,
        requireHealthCert: industry?.healthCertRequired,
        startTime: new Date(f.startTime).toISOString().slice(0, 19),
        endTime: new Date(f.endTime).toISOString().slice(0, 19),
      });
      nav(`/ent/jobs/${job.id}/applicants`);
    } catch (e: any) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <h1>发布临时用工需求</h1>
      {error && <Alert kind="error">{error}</Alert>}

      <div className="card">
        <h2>岗位与行业</h2>
        <Field label="岗位名称">
          <input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="如：双十一生鲜仓库夜班分拣" />
        </Field>
        <Field label="行业类型（决定基础风险等级、基准保证金与保险费率）">
          <select className="input" value={f.industry} onChange={(e) => set('industry', e.target.value)}>
            {Object.values(INDUSTRIES).map((i) => (
              <option key={i.key} value={i.key}>{i.label}（风险 L{i.baseRiskLevel} · 基准保证金 ¥{i.baseDeposit}/人 · 保费率 {(i.insuranceRate * 100).toFixed(1)}%{i.healthCertRequired ? ' · 需健康证' : ''}）</option>
            ))}
          </select>
        </Field>
        <Field label="工作内容描述">
          <textarea className="input" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid grid-2">
          <Field label="招聘人数"><input className="input" type="number" min={1} value={f.headcount} onChange={(e) => set('headcount', Number(e.target.value))} /></Field>
          <Field label="技能要求"><input className="input" value={f.skillRequirement} onChange={(e) => set('skillRequirement', e.target.value)} placeholder="如：会用 PDA、有分拣经验" /></Field>
        </div>
        <Field label="服装/装备要求">
          <input className="input" value={f.dressCode} onChange={(e) => set('dressCode', e.target.value)} placeholder="如：劳保鞋、黑裤黑鞋" />
        </Field>
      </div>

      <div className="card">
        <h2>地点与时间</h2>
        <Field label="作业地点"><input className="input" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="详细地址" /></Field>
        <div className="grid grid-2">
          <Field label="签到点纬度（地理围栏圆心，300m）"><input className="input" type="number" step="0.000001" value={f.lat} onChange={(e) => set('lat', Number(e.target.value))} /></Field>
          <Field label="签到点经度"><input className="input" type="number" step="0.000001" value={f.lng} onChange={(e) => set('lng', Number(e.target.value))} /></Field>
        </div>
        <div className="grid grid-2">
          <Field label="开始时间"><input className="input" type="datetime-local" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field>
          <Field label="结束时间"><input className="input" type="datetime-local" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field>
        </div>
      </div>

      <div className="card">
        <h2>工资 · 扣款 · 保险 · 结算</h2>
        <div className="grid grid-3">
          <Field label="日结工资（元/班）"><input className="input" type="number" value={f.dailyWage} onChange={(e) => set('dailyWage', Number(e.target.value))} /></Field>
          <Field label="加班费（元/小时）"><input className="input" type="number" value={f.overtimeRate} onChange={(e) => set('overtimeRate', Number(e.target.value))} /></Field>
          <Field label="餐补（元/班）"><input className="input" type="number" value={f.mealAllowance} onChange={(e) => set('mealAllowance', Number(e.target.value))} /></Field>
          <Field label="迟到扣款（元/分钟）"><input className="input" type="number" value={f.lateDeductPerMin} onChange={(e) => set('lateDeductPerMin', Number(e.target.value))} /></Field>
          <Field label="迟到宽限（分钟）"><input className="input" type="number" value={f.lateGraceMinutes} onChange={(e) => set('lateGraceMinutes', Number(e.target.value))} /></Field>
          <Field label="意外险保额（万元）"><input className="input" type="number" value={f.insuranceCoverageWan} onChange={(e) => set('insuranceCoverageWan', Number(e.target.value))} /></Field>
        </div>
        <Field label="结算方式">
          <select className="input" value={f.settlementMethod} onChange={(e) => set('settlementMethod', e.target.value)}>
            <option>日结-完工24小时内</option>
            <option>日结-完工即时</option>
            <option>周结</option>
          </select>
        </Field>
        {industry?.healthCertRequired && <Alert kind="warn">该行业岗位强制要求工人持有效健康证，系统已在报名门禁自动校验。</Alert>}
        <div className="alert alert-info">
          <div className="row">
            <Badge tone="blue">{industry?.label}</Badge>
            <span>本单预计保费 <b>¥{premiumPreview}</b>/人（企业承担）</span>
            <div className="spacer" />
            <span>发单将冻结保证金：<b className="money">¥{depositPreview}</b>
              （基准 ¥{industry?.baseDeposit}/人 × 风险倍率 {multiplier.toFixed(1)} × {f.headcount} 人）</span>
            {ent?.riskLevel >= 4 && <Badge tone="red">高风险企业：双人现场确认</Badge>}
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? '提交中…' : '确认发布并冻结保证金'}</button>
      </div>
    </div>
  );
}
