interface DetailProps {
  state: any;
}

export function Detail({ state }: DetailProps) {
  if (!state) {
    return <div className="detail-shell">読み込み中...</div>;
  }

  return (
    <div className="detail-shell">
      <h1>Komorebi 詳細</h1>
      <section>
        <h2>現在の状態</h2>
        <p>状態: {state.activeSession?.status ?? 'idle'}</p>
        <p>作業時間: {Math.floor(state.activeSession?.totalWorkSeconds / 60)} 分</p>
        <p>休憩時間: {Math.floor(state.activeSession?.totalBreakSeconds / 60)} 分</p>
      </section>
      <section>
        <h2>森の進行</h2>
        <p>{state.forestStageLabel}</p>
        <p>成長ポイント: {state.forest.totalGrowthPoints}</p>
        <p>次の段階まで: {state.nextForestThreshold} ポイント</p>
      </section>
      <section>
        <h2>最近のイベント</h2>
        <ul>
          {state.forest.recentEvents.map((event: string, index: number) => (
            <li key={index}>{event}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>訪問者</h2>
        <ul>
          {state.visitors.map((visitor: any) => (
            <li key={visitor.id}>
              {visitor.name} {visitor.discovered ? '（発見済）' : '（未発見）'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
