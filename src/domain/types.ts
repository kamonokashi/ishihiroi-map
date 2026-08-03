export type SessionStatus = 'idle' | 'working' | 'break';

export interface ActiveSession {
  status: SessionStatus;
  sessionId: string;
  startedAt: string;
  currentSegmentStartAt: string;
  totalWorkSeconds: number;
  totalBreakSeconds: number;
  taskName?: string;
  lastSavedAt: string;
}

export interface DailySummary {
  date: string;
  workSeconds: number;
  breakSeconds: number;
  sessionCount: number;
  growthPoints: number;
  visitors: string[];
  notes: string[];
}

export interface ForestState {
  totalGrowthPoints: number;
  discoveredVisitors: string[];
  recentEvents: string[];
}

export interface VisitorDefinition {
  id: string;
  name: string;
  threshold: number;
  description: string;
}

export interface AppSettings {
  schemaVersion: number;
  alwaysOnTop: boolean;
  clickThrough: boolean;
  showOnStartup: boolean;
  reduceMotion: boolean;
  useTimeOfDay: boolean;
  companionPosition?: { x: number; y: number };
}

export interface AppData {
  schemaVersion: number;
  settings: AppSettings;
  activeSession: ActiveSession | null;
  dailySummaries: DailySummary[];
  forestState: ForestState;
}

export interface VisitorStatus extends VisitorDefinition {
  discovered: boolean;
}

export interface AppStateResponse {
  settings: AppSettings;
  activeSession: ActiveSession | null;
  today: DailySummary;
  forest: ForestState;
  visitors: VisitorStatus[];
  availableActions: string[];
  forestStage: number;
  forestStageLabel: string;
  forestProgress: number;
  nextForestThreshold: number;
  currentEvent: string | null;
  canOpenDetail: boolean;
}
