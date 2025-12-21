import { app, ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../types/ipc';
import { APP_CONFIG } from '../config/constants';
import { SplashScreen } from './splash-screen';
import { ErrorUtils } from '../utils/error-utils';

export class IpcHandlers {
  static register(): void {
    ipcMain.on(IPC_CHANNELS.RELOAD_MESSENGER, (event) => {
      this.reloadContent(event);
    });

    ipcMain.on(IPC_CHANNELS.UPDATE_BADGE, (_event, count: unknown) => {
      this.updateBadge(count);
    });
  }

  private static updateBadge(count: unknown) {
    try {
      if (!this.isBadgeSupported(app.dock)) {
        return;
      }

      if (!this.isValidBadgeCountType(count)) {
        console.error('Invalid badge count type:', typeof count);
        return;
      }

      if (count) {
        const badgeString = String(count);
        if (!this.isValidBadgeNumber(badgeString)) {
          console.error('Invalid badge count value:', badgeString);
          return;
        }
        app.dock.setBadge(badgeString);
      } else {
        app.dock.setBadge('');
      }
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
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
}
