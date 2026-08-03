import './Companion.css';

interface CompanionProps {
  state: any;
  onStartWork: () => void;
  onStartBreak: () => void;
  onEndSession: () => void;
  onOpenDetail: () => void;
}

export function Companion({ state, onStartWork, onStartBreak, onEndSession, onOpenDetail }: CompanionProps) {
  const status = state?.activeSession?.status ?? 'idle';
  const workSeconds = state?.activeSession?.totalWorkSeconds ?? 0;
  const breakSeconds = state?.activeSession?.totalBreakSeconds ?? 0;
  const availableActions = state?.availableActions ?? [];

  return (
    <div className="companion-card">
      <div className="companion-scene">
        <div className="sky" />
        <div className="ground" />
        <div className="tree" />
        <div className="grass" />
        <div className="flower" />
      </div>
      <div className="companion-footer">
        <div className="info-block">
          <div className="label">状態</div>
          <div className="value">{status}</div>
        </div>
        <div className="button-row">
          {availableActions.includes('startWork') && <button className="primary-button" onClick={onStartWork}>作業をはじめる</button>}
          {availableActions.includes('startBreak') && <button className="primary-button" onClick={onStartBreak}>休憩する</button>}
          {availableActions.includes('endSession') && <button className="secondary-button" onClick={onEndSession}>セッションを終了</button>}
          <button className="secondary-button" onClick={onOpenDetail}>詳細</button>
        </div>
        <div className="status-summary">
          <div>作業: {Math.floor(workSeconds / 60)} 分</div>
          <div>休憩: {Math.floor(breakSeconds / 60)} 分</div>
        </div>
      </div>
    </div>
  );
}
