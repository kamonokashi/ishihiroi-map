import { app, BrowserWindow, ipcMain, nativeImage, screen, Tray } from 'electron';
import path from 'path';
import { AppStorage } from './storage/storage';
import { createTrayMenu } from './tray/menu';
import { createCompanionWindow, createDetailWindow, getWindows } from './windows/windows';
import { initializeSessionService } from './services/sessionService';
import { getAppSettings } from './storage/settings';

const isDev = process.env.NODE_ENV !== 'production';
let tray: Tray | null = null;
let detailWindow: BrowserWindow | null = null;
let companionWindow: BrowserWindow | null = null;
let storage: AppStorage;
let isQuitting = false;

async function createWindows() {
  storage = new AppStorage(app.getPath('userData'));
  await storage.initialize();

  const settings = await getAppSettings(storage);
  companionWindow = createCompanionWindow(settings);
  detailWindow = createDetailWindow(settings);

  const onClose = (event: Electron.Event) => {
    if (!isQuitting) {
      event.preventDefault();
      companionWindow?.hide();
    }
  };

  companionWindow.on('close', onClose);
  detailWindow.on('close', onClose);

  await initializeSessionService(storage, companionWindow, detailWindow);
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);

  tray = new Tray(trayIcon);
  createTrayMenu(tray, () => {
    companionWindow?.show();
  });
}

app.on('ready', async () => {
  await createWindows();
  createTray();

  if (isDev) {
    companionWindow?.webContents.openDevTools({ mode: 'detach' });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  companionWindow?.show();
});

app.on('before-quit', () => {
  isQuitting = true;
});
