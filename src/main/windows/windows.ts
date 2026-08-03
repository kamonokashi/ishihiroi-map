import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { AppSettings } from '../storage/settings';

const companionSize = { width: 420, height: 240 };
const detailSize = { width: 980, height: 720 };

function getScreenBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.workArea;
}

export function createCompanionWindow(settings: AppSettings) {
  const bounds = getScreenBounds();
  const x = bounds.x + bounds.width - companionSize.width - 24;
  const y = bounds.y + bounds.height - companionSize.height - 48;

  const win = new BrowserWindow({
    x: settings.companionPosition?.x ?? x,
    y: settings.companionPosition?.y ?? y,
    width: companionSize.width,
    height: companionSize.height,
    frame: false,
    transparent: true,
    alwaysOnTop: settings.alwaysOnTop,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  win.loadURL('http://localhost:5173');
  return win;
}

export function createDetailWindow(settings: AppSettings) {
  const bounds = getScreenBounds();
  const x = bounds.x + Math.max(24, (bounds.width - detailSize.width) / 2);
  const y = bounds.y + Math.max(24, (bounds.height - detailSize.height) / 2);

  const win = new BrowserWindow({
    x,
    y,
    width: detailSize.width,
    height: detailSize.height,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  win.loadURL('http://localhost:5173#detail');
  return win;
}

export function getWindows() {
  return { companionWindow: BrowserWindow.getAllWindows()[0], detailWindow: BrowserWindow.getAllWindows()[1] };
}
