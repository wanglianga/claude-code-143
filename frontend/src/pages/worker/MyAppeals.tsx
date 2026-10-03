import { useEffect, useState } from 'react';
import { get } from '../../api';
import { Spinner, StatusBadge, fmtDate, fmtMoney } from '../../components/ui';

export default function MyAppeals() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { get('/my/appeals').then(setList).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;

  return (
    <div>
      <h1>我的申诉</h1>
      {list.length === 0 ? (
        <div className="card muted">暂无申诉记录。对工资有异议时，可在任务室「日结结算」页发起申诉。</div>
      ) : (
        <div className="col">
          {list.map((a) => (
            <div key={a.id} className="card">
              <div className="row">
                <StatusBadge status={a.status} />
                <span className="small muted">{fmtDate(a.createdAt)}</span>
                <div className="spacer" />
                <span>诉求补发 <b className="money">{fmtMoney(a.claimedAmount)}</b></span>
                {a.reissueAmount != null && <span>实际补发 <b className="money-green">{fmtMoney(a.reissueAmount)}</b></span>}
              </div>
              <p style={{ margin: '8px 0' }}>{a.reason}</p>
              {a.decisionNote && <div className="alert alert-info" style={{ margin: 0 }}>客服处理：{a.decisionNote}</div>}
              {a.arbitrationAward && <div className="alert alert-warn" style={{ margin: '8px 0 0' }}>仲裁裁决：{a.arbitrationAward}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
