import { ActiveSession, DailySummary, SessionStatus } from './types';

export function createIdleSession(): ActiveSession {
  const now = new Date().toISOString();
  return {
    status: 'idle',
    sessionId: `session-${Date.now()}`,
    startedAt: now,
    currentSegmentStartAt: now,
    totalWorkSeconds: 0,
    totalBreakSeconds: 0,
    lastSavedAt: now
  };
}

export function elapsedSeconds(start: string, end: string) {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));
}

export function updateSessionToWorking(session: ActiveSession): ActiveSession {
  if (session.status === 'working') return session;
  return {
    ...session,
    status: 'working',
    currentSegmentStartAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString()
  };
}

export function updateSessionToBreak(session: ActiveSession): ActiveSession {
  const now = new Date().toISOString();
  const extraBreak = session.status === 'working' ? elapsedSeconds(session.currentSegmentStartAt, now) : 0;
  return {
    ...session,
    status: 'break',
    currentSegmentStartAt: now,
    totalWorkSeconds: session.totalWorkSeconds + extraBreak,
    lastSavedAt: now
  };
}

export function endSession(session: ActiveSession): ActiveSession {
  const now = new Date().toISOString();
  const extra = session.status === 'working' ? { totalWorkSeconds: session.totalWorkSeconds + elapsedSeconds(session.currentSegmentStartAt, now) } : { totalBreakSeconds: session.totalBreakSeconds + elapsedSeconds(session.currentSegmentStartAt, now) };
  return {
    ...session,
    status: 'idle',
    currentSegmentStartAt: now,
    ...extra,
    lastSavedAt: now
  };
}

export function toDailySummary(session: ActiveSession, date: string): DailySummary {
  return {
    date,
    workSeconds: session.totalWorkSeconds,
    breakSeconds: session.totalBreakSeconds,
    sessionCount: session.status === 'idle' ? 1 : 0,
    growthPoints: session.totalWorkSeconds / 60,
    visitors: [],
    notes: []
  };
}
