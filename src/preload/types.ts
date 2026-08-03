export type SessionStatus = 'idle' | 'working' | 'break';

export interface VisitorStatus {
  id: string;
  name: string;
  threshold: number;
  description: string;
  discovered: boolean;
}

export interface AppStateResponse {
  settings: unknown;
  activeSession: {
    status: SessionStatus;
    sessionId: string;
    startedAt: string;
    currentSegmentStartAt: string;
    totalWorkSeconds: number;
    totalBreakSeconds: number;
    taskName?: string;
    lastSavedAt: string;
  } | null;
  today: {
    date: string;
    workSeconds: number;
    breakSeconds: number;
    sessionCount: number;
    growthPoints: number;
    visitors: string[];
    notes: string[];
  };
  forest: {
    totalGrowthPoints: number;
    discoveredVisitors: string[];
    recentEvents: string[];
  };
  visitors: VisitorStatus[];
  availableActions: string[];
  forestStage: number;
  forestStageLabel: string;
  forestProgress: number;
  nextForestThreshold: number;
  currentEvent: string | null;
  canOpenDetail: boolean;
}

export interface KomorebiApi {
  getState: () => Promise<AppStateResponse>;
  startWork: () => Promise<AppStateResponse>;
  startBreak: () => Promise<AppStateResponse>;
  endSession: () => Promise<AppStateResponse>;
  openDetail: () => Promise<AppStateResponse>;
  saveSettings: (settings: unknown) => Promise<AppStateResponse>;
}

declare global {
  interface Window {
    komorebi: KomorebiApi;
  }
}
