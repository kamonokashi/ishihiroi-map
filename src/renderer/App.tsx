import { useEffect, useState } from 'react';
import { Companion } from './components/Companion';
import { Detail } from './components/Detail';

export function App() {
  const [state, setState] = useState<any>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    window.komorebi?.getState().then(setState);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state?.activeSession?.status !== 'idle') {
      window.komorebi?.getState().then(setState);
    }
  }, [tick]);

  const page = window.location.hash === '#detail' ? 'detail' : 'companion';

  return (
    <div className="app-shell">
      {page === 'companion' ? (
        <Companion state={state} onStartWork={() => window.komorebi?.startWork().then(setState)} onStartBreak={() => window.komorebi?.startBreak().then(setState)} onEndSession={() => window.komorebi?.endSession().then(setState)} onOpenDetail={() => window.komorebi?.openDetail().then(setState)} />
      ) : (
        <Detail state={state} />
      )}
    </div>
  );
}
