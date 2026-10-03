import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../../api';
import { Spinner, StatusBadge, fmtDate, fmtMoney } from '../../components/ui';

const TABS = [
  { key: '', label: '全部' },
  { key: 'OPEN', label: '待处理' },
  { key: 'REISSUED', label: '已补发' },
  { key: 'UPHELD', label: '维持扣款' },
  { key: 'ARBITRATION', label: '仲裁中' },
  { key: 'ARBITRATION_AWARD', label: '仲裁结案' },
];

export default function SupportAppeals() {
  const [tab, setTab] = useState('OPEN');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get(`/support/appeals${tab ? `?status=${tab}` : ''}`).then(setList).finally(() => setLoading(false));
  }, [tab]);

  return (
    <div>
      <h1>申诉工单</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="card">
        {loading ? <Spinner /> : (
          <table>
            <thead><tr><th>#</th><th>工人</th><th>企业</th><th>诉求</th><th>理由</th><th>时间</th><th>状态</th><th></th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>工人 #{a.workerId}</td>
                  <td>企业 #{a.enterpriseId}</td>
                  <td className="money">{fmtMoney(a.claimedAmount)}</td>
                  <td className="small" style={{ maxWidth: 260 }}>{a.reason}</td>
                  <td className="small">{fmtDate(a.createdAt)}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><Link className="btn btn-sm btn-primary" to={`/support/appeals/${a.id}`}>处理</Link></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="muted">暂无工单</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
