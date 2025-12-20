import 'v8-compile-cache';
import { app, BrowserWindow } from 'electron';
import { WindowManager } from './services/window-manager';
import { IpcHandlers } from './services/ipc-handlers';
import { APP_CONFIG } from './config/constants';
import * as path from 'path';

// Enable hot reload in development
if (!app.isPackaged) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      forceHardReset: true,
      hardResetMethod: 'exit'
    });
  } catch (err) {
    console.error('Failed to enable hot reload:', err);
  }
}

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
