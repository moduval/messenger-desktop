import { app, ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../types/ipc';
import { APP_CONFIG } from '../config/constants';
import { SplashScreen } from './splash-screen';
import { ErrorUtils } from '../utils/error-utils';
import { WindowsBadgeIconGenerator } from '../utils/windows-badge-icon-generator';
import { NotificationManager } from './notification-manager';
import { type NotificationData } from '../types/notification';

export class IpcHandlers {
  static register(): void {
    ipcMain.on(IPC_CHANNELS.RELOAD_MESSENGER, (event) => {
      this.reloadContent(event);
    });

    ipcMain.on(IPC_CHANNELS.UPDATE_BADGE, (_event, count: unknown) => {
      this.updateBadge(count);
    });

    ipcMain.on(IPC_CHANNELS.SHOW_NOTIFICATION, (_event, data: unknown) => {
      this.showNotification(data);
    });
  }

  private static updateBadge(count: unknown) {
    try {
      if (!this.isValidBadgeCountType(count)) {
        console.error('Invalid badge count type:', typeof count);
        return;
      }

      if (process.platform === 'darwin') {
        this.updateMacOSBadge(count);
      } else if (process.platform === 'win32') {
        this.updateWindowsBadge(count);
      }
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  }

  private static updateMacOSBadge(count: string | number | null | undefined) {
    if (!this.isBadgeSupported(app.dock)) {
      return;
    }

    if (!count) {
      app.dock.setBadge('');
      return;
    }

    const badgeString = String(count);
    if (!this.isValidBadgeNumber(badgeString)) {
      console.error('Invalid badge count value:', badgeString);
      return;
    }
    app.dock.setBadge(badgeString);
  }

  private static updateWindowsBadge(count: string | number | null | undefined) {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
      return;
    }

    if (!count) {
      mainWindow.setOverlayIcon(null, '');
      return;
    }

    const badgeString = String(count);
    if (!this.isValidBadgeNumber(badgeString)) {
      console.error('Invalid badge count value:', badgeString);
      return;
    }

    const badgeCount = parseInt(badgeString, 10);
    const badgeIcon = WindowsBadgeIconGenerator.createNumberedBadgeIcon(badgeCount);
    const description = badgeCount === 1 ? '1 unread message' : `${badgeCount} unread messages`;

    mainWindow.setOverlayIcon(badgeIcon, description);
  }

  private static showNotification(data: unknown): void {
    if (!this.isValidNotificationData(data)) {
      console.error('Invalid notification data:', data);
      return;
    }

    NotificationManager.show(data);
  }

  private static reloadContent(event: Electron.IpcMainEvent) {
    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) {
      return;
    }

    SplashScreen.show();

    browserWindow.loadURL(APP_CONFIG.URLS.MESSENGER).catch((error) => {
      if (ErrorUtils.isAbortedError(error)) {
        return;
      }
      console.error('Failed to reload Messenger:', error);
      SplashScreen.close();
    });
  }

  private static isBadgeSupported(dock: Electron.Dock | undefined): dock is Electron.Dock {
    return process.platform === 'darwin' && !!dock;
  }

  private static isValidBadgeCountType(
    count: unknown
  ): count is string | number | null | undefined {
    return (
      count === null ||
      count === undefined ||
      typeof count === 'string' ||
      typeof count === 'number'
    );
  }

  private static isValidBadgeNumber(badgeString: string): boolean {
    const num = parseInt(badgeString, 10);
    return !isNaN(num) && num >= 0 && num <= 9999;
  }

  private static isValidNotificationData(data: unknown): data is NotificationData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'title' in data &&
      typeof (data as Record<string, unknown>).title === 'string' &&
      'body' in data &&
      typeof (data as Record<string, unknown>).body === 'string' &&
      'count' in data &&
      typeof (data as Record<string, unknown>).count === 'number'
    );
  }
}
