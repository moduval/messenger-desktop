import { ipcRenderer, contextBridge } from 'electron';
import { BadgeManager } from './services/badge-manager';
import { IPC_CHANNELS } from './types/ipc';

contextBridge.exposeInMainWorld('messengerApi', {
  updateBadge: (count: string | null) => {
    ipcRenderer.send(IPC_CHANNELS.UPDATE_BADGE, count);
  },
  reloadMessenger: () => {
    ipcRenderer.send(IPC_CHANNELS.RELOAD_MESSENGER);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.href.includes('messenger.com')) {
    return;
  }

  try {
    BadgeManager.init((count) => {
      ipcRenderer.send(IPC_CHANNELS.UPDATE_BADGE, count);
    });
  } catch (error) {
    console.error('Failed to initialize BadgeManager:', error);
  }
});

window.addEventListener('beforeunload', () => {
  BadgeManager.destroy();
});
