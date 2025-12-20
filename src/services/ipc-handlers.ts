import { app, ipcMain } from 'electron';

export class IpcHandlers {
  static register(): void {
    ipcMain.on('update-badge', (_event, count: unknown) => {
      try {
        if (!this.isBadgeSupported()) {
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
    });
  }

  private static isBadgeSupported(): boolean {
    return process.platform === 'darwin' && !!app.dock;
  }

  private static isValidBadgeCountType(count: unknown): boolean {
    return count === null || count === undefined || typeof count === 'string' || typeof count === 'number';
  }

  private static isValidBadgeNumber(badgeString: string): boolean {
    const num = parseInt(badgeString, 10);
    return !isNaN(num) && num >= 0 && num <= 9999;
  }
}
