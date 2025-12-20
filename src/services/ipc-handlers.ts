import { app, ipcMain } from 'electron';

export class IpcHandlers {
  static register(): void {
    ipcMain.on('update-badge', (_event, count) => {
      if (process.platform !== 'darwin' || !app.dock) {
        return;
      }

      if (count) {
        app.dock.setBadge(count.toString());
      } else {
        app.dock.setBadge('');
      }
    });
  }
}
