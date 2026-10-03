import { useEffect, useState } from 'react';
import { get } from '../../api';
import { Spinner, StatusBadge, fmtDateTime, fmtMoney } from '../../components/ui';

export default function EntAppeals() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { get('/enterprise/appeals').then(setList).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;

  return (
    <div>
      <h1>争议处理（企业侧）</h1>
      {list.length === 0 ? (
        <div className="card muted">暂无工人申诉。客服裁决时可调取该任务的签到轨迹、主管确认、现场照片与聊天记录。</div>
      ) : (
        <div className="col">
          {list.map((a) => (
            <div key={a.id} className="card">
              <div className="row">
                <StatusBadge status={a.status} />
                <span className="small muted">{fmtDateTime(a.createdAt)}</span>
                <div className="spacer" />
                <span>工人诉求 <b className="money">{fmtMoney(a.claimedAmount)}</b></span>
                {a.reissueAmount != null && <span>裁决补发 <b className="money-green">{fmtMoney(a.reissueAmount)}</b></span>}
              </div>
              <p style={{ margin: '8px 0' }}>{a.reason}</p>
              {a.decisionNote && <div className="alert alert-info" style={{ margin: 0 }}>客服/仲裁意见：{a.decisionNote}</div>}
              {a.arbitrationAward && <div className="alert alert-warn" style={{ margin: '8px 0 0' }}>仲裁裁决书：{a.arbitrationAward}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
