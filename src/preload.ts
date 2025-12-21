import { ipcRenderer, contextBridge } from 'electron';
import { BadgeManager } from './services/badge-manager';
import { IPC_CHANNELS } from './types/ipc';
import { NotificationData } from './types/notification';

contextBridge.exposeInMainWorld('messengerApi', {
  updateBadge: (count: string | null) => {
    ipcRenderer.send(IPC_CHANNELS.UPDATE_BADGE, count);
  },
  reloadMessenger: () => {
    ipcRenderer.send(IPC_CHANNELS.RELOAD_MESSENGER);
  }
});

let lastNumericCount = 0;

function handleBadgeUpdate(count: string | null): void {
  ipcRenderer.send(IPC_CHANNELS.UPDATE_BADGE, count);

  const currentCount = count ? parseInt(count, 10) : 0;
  if (!isNaN(currentCount) && currentCount > lastNumericCount && lastNumericCount > 0) {
    sendNewMessageNotification(currentCount);
  }
  lastNumericCount = !isNaN(currentCount) ? currentCount : 0;
}

function sendNewMessageNotification(currentCount: number): void {
  const newMessages = currentCount - lastNumericCount;
  const notificationData: NotificationData = {
    title: 'New Messages',
    body: `You have ${newMessages} new message${newMessages > 1 ? 's' : ''}`,
    count: currentCount
  };
  ipcRenderer.send(IPC_CHANNELS.SHOW_NOTIFICATION, notificationData);
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.href.includes('messenger.com')) {
    return;
  }

  try {
    BadgeManager.init(handleBadgeUpdate);
  } catch (error) {
    console.error('Failed to initialize BadgeManager:', error);
  }
});

window.addEventListener('beforeunload', () => {
  BadgeManager.destroy();
});
