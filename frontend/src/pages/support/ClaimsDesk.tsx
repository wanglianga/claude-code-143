import { useEffect, useState } from 'react';
import { get, post } from '../../api';
import { Alert, Badge, Spinner, StatusBadge, fmtDateTime, fmtMoney } from '../../components/ui';

export default function ClaimsDesk() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = () => get('/support/claims').then(setList).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const adjust = async (id: number, approve: boolean) => {
    setMsg(''); setError('');
    try {
      await post(`/support/claims/${id}/adjust`, { approve, note: notes[id] || '客服复核' });
      setMsg(approve ? '理赔已核准' : '理赔已拒赔');
      await load();
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <h1>工伤理赔复核</h1>
      {msg && <Alert kind="ok">{msg}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      <Alert kind="warn">
        铁律：保险只在「实际到岗四重校验通过 + 主管确认 + 企业确认承保」之后生效。
        事故时点 <code>coveredAtOccurrence=false</code> 的理赔单，任何角色都无法改为赔付——平台不允许事故后补录保险。
      </Alert>
      <div className="card">
        <table>
          <thead><tr><th>#</th><th>工人/企业</th><th>伤情</th><th>索赔</th><th>事故时保险</th><th>状态</th><th>记录</th><th>复核</th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td className="small">#{c.workerId} / 企业#{c.enterpriseId}<br />派单 #{c.assignmentId}</td>
                <td className="small" style={{ maxWidth: 220 }}>{c.injuryDesc}</td>
                <td className="money">{fmtMoney(c.claimAmount)}</td>
                <td>
                  {c.coveredAtOccurrence
                    ? <Badge tone="green">保障期内</Badge>
                    : <Badge tone="red">未生效·拒赔</Badge>}
                </td>
                <td><StatusBadge status={c.status} /></td>
                <td className="small" style={{ maxWidth: 260 }}>{c.adjusterNote}</td>
                <td>
                  {c.status !== 'APPROVED' && c.status !== 'REJECTED' ? (
                    <div className="col" style={{ gap: 6 }}>
                      <input className="input" style={{ width: 150 }} placeholder="复核备注"
                        value={notes[c.id] || ''} onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))} />
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => adjust(c.id, true)}>核准</button>
                        <button className="btn btn-danger btn-sm" onClick={() => adjust(c.id, false)}>拒赔</button>
                      </div>
                    </div>
                  ) : <span className="small muted">{fmtDateTime(c.createdAt)}</span>}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="muted">暂无理赔单</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
