import { ipcRenderer, contextBridge } from 'electron';
import { BadgeManager } from './services/badge-manager';

contextBridge.exposeInMainWorld('messengerApi', {
  updateBadge: (count: string | null) => {
    ipcRenderer.send('update-badge', count);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  BadgeManager.init((count) => {
    ipcRenderer.send('update-badge', count);
  });
});

window.addEventListener('beforeunload', () => {
  BadgeManager.destroy();
});
