import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('komorebi', {
  getState: async () => ipcRenderer.invoke('app:get-state'),
  startWork: async () => ipcRenderer.invoke('app:start-work'),
  startBreak: async () => ipcRenderer.invoke('app:start-break'),
  endSession: async () => ipcRenderer.invoke('app:end-session'),
  openDetail: async () => ipcRenderer.invoke('app:open-detail'),
  saveSettings: async (settings: unknown) => ipcRenderer.invoke('app:save-settings', settings)
});
