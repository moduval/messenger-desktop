import 'v8-compile-cache';
import { app, BrowserWindow } from 'electron';
import { WindowManager } from './services/window-manager';
import { IpcHandlers } from './services/ipc-handlers';
import { APP_CONFIG } from './config/constants';

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock?.setIcon(APP_CONFIG.WINDOW.ICON_PATH);
  }

  WindowManager.create();
  IpcHandlers.register();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      WindowManager.create();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
