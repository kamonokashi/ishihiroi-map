import { AppStorage } from './storage';

export interface AppSettings {
  schemaVersion: number;
  alwaysOnTop: boolean;
  clickThrough: boolean;
  showOnStartup: boolean;
  reduceMotion: boolean;
  useTimeOfDay: boolean;
  companionPosition?: { x: number; y: number };
}

const defaultSettings: AppSettings = {
  schemaVersion: 1,
  alwaysOnTop: true,
  clickThrough: false,
  showOnStartup: true,
  reduceMotion: false,
  useTimeOfDay: true
};

export async function getAppSettings(storage: AppStorage): Promise<AppSettings> {
  const data = storage.read();
  return { ...defaultSettings, ...(data.settings ?? {}) };
}

export function saveAppSettings(storage: AppStorage, settings: AppSettings) {
  const data = storage.read();
  storage.write({ ...data, settings });
}
