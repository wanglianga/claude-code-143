import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get, post } from '../../api';
import { Alert, Badge, Spinner, StatusBadge, fmtMoney } from '../../components/ui';

export default function JobApplicants() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    setJob(await get(`/jobs/${id}`));
    setList(await get(`/jobs/${id}/applicants`));
    setSettlements(await get(`/settlements?jobId=${id}`));
  };
  useEffect(() => { load(); }, [id]);

  const review = async (aid: number, accept: boolean) => {
    setError(''); setMsg('');
    try {
      await post(`/assignments/${aid}/review`, { accept });
      setMsg(accept ? '已录取，保单已生成（待到岗生效）' : '已拒绝报名');
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const payAll = async () => {
    const ids = settlements.filter((s) => s.status !== 'PAID' && s.status !== 'ADJUSTED').map((s) => s.assignmentId);
    if (!ids.length) return;
    await post('/settlements/pay', { assignmentIds: ids });
    setMsg('已批量发放日结工资');
    await load();
  };

  if (!job) return <Spinner />;

  return (
    <div>
      <Link className="btn btn-sm" to="/ent/jobs">← 岗位管理</Link>
      <div className="fab-space" />
      <h1>{job.title} · 报名与派单</h1>
      {error && <Alert kind="error">{error}</Alert>}
      {msg && <Alert kind="ok">{msg}</Alert>}

      <div className="card">
        <div className="row">
          <Badge tone="blue">{job.industryLabel}</Badge>
          <StatusBadge status={job.status} />
          <span className="small muted">已录取 {job.acceptedWorkers?.length || 0}/{job.headcount}</span>
          <div className="spacer" />
          <span className="small">日结 {fmtMoney(job.dailyWage)} · 冻结保证金 {fmtMoney(job.depositRequired)} · 预付款 {fmtMoney(job.prepayment)}</span>
        </div>
      </div>

      <div className="card">
        <h2>报名工人（实名 / 资质 / 历史评价门禁已由平台校验）</h2>
        <table>
          <thead><tr><th>工人</th><th>实名</th><th>健康证</th><th>人脸</th><th>历史评分</th><th>完工/爽约</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td><b>{a.worker?.name}</b><div className="small muted">{a.worker?.phone}</div></td>
                <td>{a.worker?.idVerified ? <Badge tone="green">已实名</Badge> : <Badge tone="red">未实名</Badge>}</td>
                <td>{a.worker?.healthCertUntil ? <Badge tone="green">{a.worker.healthCertUntil}</Badge> : (job.requireHealthCert ? <Badge tone="red">缺失</Badge> : '—')}</td>
                <td>{a.worker?.hasFaceSample ? <Badge tone="green">已采集</Badge> : <Badge tone="orange">未采集</Badge>}</td>
                <td>⭐ {a.worker?.avgRating}（{a.worker?.reviewCount}）</td>
                <td>{a.worker?.completedCount} / {a.worker?.noShowCount}</td>
                <td><StatusBadge status={a.status} /></td>
                <td>
                  {a.status === 'APPLIED' && (
                    <div className="row">
                      <button className="btn btn-success btn-sm" onClick={() => review(a.id, true)}>录取</button>
                      <button className="btn btn-sm btn-danger" onClick={() => review(a.id, false)}>不录取</button>
                    </div>
                  )}
                  {['ACCEPTED', 'CHECKED_IN', 'WORKING', 'COMPLETED', 'LEFT_EARLY'].includes(a.status) && (
                    <Link className="btn btn-sm btn-primary" to={`/room/${a.id}`}>任务室</Link>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="muted">暂无报名</td></tr>}
          </tbody>
        </table>
      </div>

      {settlements.length > 0 && (
        <div className="card">
          <div className="row">
            <h2 style={{ margin: 0 }}>日结单（{settlements.length}）</h2>
            <div className="spacer" />
            <button className="btn btn-success btn-sm" onClick={payAll}>一键发放全部待发日结</button>
          </div>
          <table>
            <thead><tr><th>派单#</th><th>工时</th><th>加班</th><th>应发工人</th><th>企业应付</th><th>预付款抵扣</th><th>状态</th><th></th></tr></thead>
            <tbody>
              {settlements.map((s: any) => (
                <tr key={s.id}>
                  <td>#{s.assignmentId}</td>
                  <td>{s.workMinutes} 分（迟到 {s.lateMinutes}）</td>
                  <td>{s.overtimeMinutes} 分</td>
                  <td className="money">{fmtMoney(s.workerPayable)}</td>
                  <td>{fmtMoney(s.enterpriseCharged)}</td>
                  <td>{fmtMoney(s.enterprisePrepaymentUsed)}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><Link className="btn btn-sm" to={`/room/${s.assignmentId}`}>查看</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
