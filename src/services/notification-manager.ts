import { Notification, BrowserWindow, app } from 'electron';
import { type NotificationData, type NotificationOptions } from '../types/notification';
import { APP_CONFIG } from '../config/constants';

export class NotificationManager {
  private static isInitialized = false;

  static init(appId: string): void {
    if (this.isInitialized) {
      return;
    }

    this.setupWindowsAppUserModelId(appId);

    if (!this.isSupported()) {
      console.warn('Notifications are not supported on this system');
      return;
    }

    this.isInitialized = true;
  }

  private static setupWindowsAppUserModelId(appId: string): void {
    if (process.platform === 'win32') {
      app.setAppUserModelId(appId);
    }
  }

  static isSupported(): boolean {
    return Notification.isSupported();
  }

  static show(data: NotificationData): void {
    if (!this.isInitialized) {
      console.warn('NotificationManager not initialized');
      return;
    }

    try {
      const notification = this.createNotification({
        title: data.title,
        body: data.body,
        icon: APP_CONFIG.WINDOW.ICON_PATH
      });

      this.attachClickHandler(notification);
      notification.show();
    } catch (error) {
      this.handleNotificationError(error);
    }
  }

  private static createNotification(options: NotificationOptions): Electron.Notification {
    return new Notification({
      title: options.title,
      body: options.body,
      icon: options.icon
    });
  }

  private static attachClickHandler(notification: Electron.Notification): void {
    notification.on('click', () => {
      this.focusMainWindow();
    });
  }

  private static focusMainWindow(): void {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.show();
    mainWindow.focus();
  }

  private static handleNotificationError(error: unknown): void {
    // Silently fail if notification permission is denied
    // The app should continue working even without notifications
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Failed to show notification (may be blocked by user):', errorMessage);
  }
}
