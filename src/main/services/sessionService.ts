import { BrowserWindow, ipcMain } from 'electron';
import { AppStorage } from '../storage/storage';
import {
  ActiveSession,
  AppData,
  AppSettings,
  AppStateResponse,
  DailySummary,
  ForestState,
  VisitorDefinition,
  SessionStatus
} from '../../domain/types';
import {
  addGrowthPoints,
  growthStage,
  getProgressToNextStage,
  stageLabel
} from '../../domain/forest';
import {
  createIdleSession,
  elapsedSeconds,
  endSession,
  updateSessionToBreak,
  updateSessionToWorking
} from '../../domain/session';

const VISITOR_CATALOG: VisitorDefinition[] = [
  {
    id: 'fox',
    name: '狐',
    threshold: 15,
    description: '勤勉な狐が森を訪れます。'
  },
  {
    id: 'deer',
    name: '鹿',
    threshold: 35,
    description: '静かな鹿が木陰に現れます。'
  },
  {
    id: 'owl',
    name: '梟',
    threshold: 60,
    description: '夜の森に梟の目がきらめきます。'
  }
];

const RANDOM_EVENTS = [
  '風がそよぎました。',
  '花びらが舞い降りました。',
  '小鳥のさえずりが聞こえます。',
  '木漏れ日が差し込みました。'
];

const AUTO_END_SECONDS = 24 * 60 * 60;
const EVENT_INTERVAL_MS = 30_000;
let appData: AppData;
let eventTimer: NodeJS.Timeout | null = null;

const defaultSettings: AppSettings = {
  schemaVersion: 1,
  alwaysOnTop: true,
  clickThrough: false,
  showOnStartup: true,
  reduceMotion: false,
  useTimeOfDay: true
};

function createDefaultAppData(settings: AppSettings): AppData {
  return {
    schemaVersion: 1,
    settings,
    activeSession: createIdleSession(),
    dailySummaries: [],
    forestState: {
      totalGrowthPoints: 0,
      discoveredVisitors: [],
      recentEvents: []
    }
  };
}

function normalizeStoredData(stored: any): AppData {
  const settings = { ...defaultSettings, ...(stored.settings ?? {}) };
  const activeSession = stored.activeSession ? { ...createIdleSession(), ...stored.activeSession } : createIdleSession();
  const dailySummaries: DailySummary[] = Array.isArray(stored.dailySummaries) ? stored.dailySummaries : [];
  const forestState: ForestState = {
    totalGrowthPoints: stored?.forestState?.totalGrowthPoints ?? 0,
    discoveredVisitors: Array.isArray(stored?.forestState?.discoveredVisitors) ? stored.forestState.discoveredVisitors : [],
    recentEvents: Array.isArray(stored?.forestState?.recentEvents) ? stored.forestState.recentEvents : []
  };

  return {
    schemaVersion: stored?.schemaVersion ?? 1,
    settings,
    activeSession,
    dailySummaries,
    forestState
  };
}

function saveAppData(storage: AppStorage) {
  storage.write(appData);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTodaySummary(now = new Date()): DailySummary {
  const date = formatDate(now);
  let summary = appData.dailySummaries.find((item) => item.date === date);

  if (!summary) {
    summary = {
      date,
      workSeconds: 0,
      breakSeconds: 0,
      sessionCount: 0,
      growthPoints: 0,
      visitors: [],
      notes: []
    };
  }

  if (appData.activeSession && appData.activeSession.status === 'working') {
    summary = {
      ...summary,
      workSeconds: summary.workSeconds + elapsedSeconds(appData.activeSession.currentSegmentStartAt, now.toISOString()),
      growthPoints: Math.floor((summary.workSeconds + elapsedSeconds(appData.activeSession.currentSegmentStartAt, now.toISOString())) / 60)
    };
  } else if (appData.activeSession && appData.activeSession.status === 'break') {
    summary = {
      ...summary,
      breakSeconds: summary.breakSeconds + elapsedSeconds(appData.activeSession.currentSegmentStartAt, now.toISOString())
    };
  }

  return summary;
}

function getVisitorStatus() {
  return VISITOR_CATALOG.map((visitor) => ({
    ...visitor,
    discovered: appData.forestState.totalGrowthPoints >= visitor.threshold
  }));
}

function getAvailableActions() {
  if (!appData.activeSession) {
    return ['startWork'];
  }

  switch (appData.activeSession.status) {
    case 'working':
      return ['startBreak', 'endSession'];
    case 'break':
      return ['startWork', 'endSession'];
    default:
      return ['startWork'];
  }
}

function addEvent(message: string) {
  appData.forestState.recentEvents.unshift(message);
  if (appData.forestState.recentEvents.length > 10) {
    appData.forestState.recentEvents = appData.forestState.recentEvents.slice(0, 10);
  }
}

function commitSession(session: ActiveSession) {
  const endedSession = session.status === 'idle' ? session : endSession(session);
  const summaryDate = formatDate(new Date(endedSession.startedAt));
  const summary = appData.dailySummaries.find((item) => item.date === summaryDate);

  if (summary) {
    summary.workSeconds += endedSession.totalWorkSeconds;
    summary.breakSeconds += endedSession.totalBreakSeconds;
    summary.sessionCount += 1;
    summary.growthPoints = Math.floor(summary.workSeconds / 60);
  } else {
    appData.dailySummaries.push({
      date: summaryDate,
      workSeconds: endedSession.totalWorkSeconds,
      breakSeconds: endedSession.totalBreakSeconds,
      sessionCount: 1,
      growthPoints: Math.floor(endedSession.totalWorkSeconds / 60),
      visitors: [],
      notes: []
    });
  }

  const growthPoints = Math.floor(endedSession.totalWorkSeconds / 60);
  if (growthPoints > 0) {
    appData.forestState = addGrowthPoints(appData.forestState, growthPoints);
    addEvent(`作業で ${growthPoints} ポイント獲得しました。`);
  }

  appData.forestState.discoveredVisitors = Array.from(
    new Set([
      ...appData.forestState.discoveredVisitors,
      ...VISITOR_CATALOG.filter((visitor) => appData.forestState.totalGrowthPoints >= visitor.threshold).map((visitor) => visitor.id)
    ])
  );
}

function autoEndIfNeeded() {
  if (!appData.activeSession || appData.activeSession.status === 'idle') {
    return;
  }

  const elapsed = elapsedSeconds(appData.activeSession.startedAt, new Date().toISOString());
  if (elapsed >= AUTO_END_SECONDS) {
    commitSession(appData.activeSession);
    appData.activeSession = createIdleSession();
    saveAppData(storageInstance!);
  }
}

function createNewWorkSession(): ActiveSession {
  const now = new Date().toISOString();
  return {
    status: 'working',
    sessionId: `session-${Date.now()}`,
    startedAt: now,
    currentSegmentStartAt: now,
    totalWorkSeconds: 0,
    totalBreakSeconds: 0,
    lastSavedAt: now
  };
}

function getAppState(): AppStateResponse {
  autoEndIfNeeded();
  const currentEvent = appData.forestState.recentEvents[0] ?? null;
  const stage = growthStage(appData.forestState.totalGrowthPoints);
  const progress = getProgressToNextStage(appData.forestState.totalGrowthPoints);

  return {
    settings: appData.settings,
    activeSession: appData.activeSession,
    today: getTodaySummary(),
    forest: appData.forestState,
    visitors: getVisitorStatus(),
    availableActions: getAvailableActions(),
    forestStage: stage,
    forestStageLabel: stageLabel(stage),
    forestProgress: progress.progress,
    nextForestThreshold: progress.nextThreshold,
    currentEvent,
    canOpenDetail: true
  };
}

let storageInstance: AppStorage | null = null;

function scheduleEventLoop() {
  if (eventTimer) {
    clearInterval(eventTimer);
  }

  eventTimer = setInterval(() => {
    if (appData.activeSession?.status === 'working') {
      const nextEvent = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
      addEvent(nextEvent);
      saveAppData(storageInstance!);
    }
  }, EVENT_INTERVAL_MS);
}

export async function initializeSessionService(storage: AppStorage, companionWindow: BrowserWindow | null, detailWindow: BrowserWindow | null) {
  storageInstance = storage;
  const stored = storage.read();
  appData = normalizeStoredData(stored);
  appData.settings = { ...defaultSettings, ...appData.settings };

  ipcMain.handle('app:get-state', async () => getAppState());
  ipcMain.handle('app:start-work', async () => {
    if (appData.activeSession?.status === 'break') {
      appData.activeSession = updateSessionToWorking(appData.activeSession);
    } else if (appData.activeSession?.status === 'idle') {
      appData.activeSession = createNewWorkSession();
    }
    if (appData.activeSession) {
      appData.activeSession.lastSavedAt = new Date().toISOString();
    }
    saveAppData(storage);
    return getAppState();
  });

  ipcMain.handle('app:start-break', async () => {
    if (appData.activeSession?.status === 'working') {
      appData.activeSession = updateSessionToBreak(appData.activeSession);
      if (appData.activeSession) {
        appData.activeSession.lastSavedAt = new Date().toISOString();
      }
      saveAppData(storage);
    }
    return getAppState();
  });

  ipcMain.handle('app:end-session', async () => {
    if (appData.activeSession && appData.activeSession.status !== 'idle') {
      commitSession(appData.activeSession);
      appData.activeSession = createIdleSession();
      saveAppData(storage);
    }
    return getAppState();
  });

  ipcMain.handle('app:open-detail', async () => {
    detailWindow?.show();
    detailWindow?.focus();
    return getAppState();
  });

  ipcMain.handle('app:save-settings', async (_event, settings: AppSettings) => {
    appData.settings = { ...appData.settings, ...settings };
    saveAppData(storage);
    return getAppState();
  });

  scheduleEventLoop();
}
