import { ipcRenderer, contextBridge } from 'electron';
import { BadgeManager } from './services/badge-manager';
import { IPC_CHANNELS } from './types/ipc';

contextBridge.exposeInMainWorld('messengerApi', {
  updateBadge: (count: string | null) => {
    ipcRenderer.send(IPC_CHANNELS.UPDATE_BADGE, count);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  BadgeManager.init((count) => {
    ipcRenderer.send(IPC_CHANNELS.UPDATE_BADGE, count);
  });
});

window.addEventListener('beforeunload', () => {
  BadgeManager.destroy();
});
