import { app, Menu, Tray } from 'electron';

export function createTrayMenu(tray: Tray, showCompanion: () => void) {
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Komorebi を表示', type: 'normal', click: showCompanion },
    { type: 'separator' },
    { label: '詳細画面を開く', type: 'normal', click: showCompanion },
    { type: 'separator' },
    { label: 'アプリを終了', type: 'normal', click: () => app.quit() }
  ]);

  tray.setToolTip('Komorebi');
  tray.setContextMenu(contextMenu);
}
