import 'v8-compile-cache';
import { app, BrowserWindow, dialog } from 'electron';
import { WindowManager } from './services/window-manager';
import { IpcHandlers } from './services/ipc-handlers';
import { MenuManager } from './services/menu-manager';
import { NotificationManager } from './services/notification-manager';
import { APP_CONFIG } from './config/constants';
import * as path from 'path';

enableHotReload();

// Set app name before ready event
if (process.platform === 'darwin') {
  app.name = APP_CONFIG.APP.NAME;
}

app.whenReady().then(() => {
  try {
    if (process.platform === 'darwin') {
      app.dock?.setIcon(APP_CONFIG.WINDOW.ICON_PATH);
    }

    MenuManager.create();
    WindowManager.create();
    NotificationManager.init(APP_CONFIG.APP.ID);
    IpcHandlers.register();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        try {
          WindowManager.create();
        } catch (error) {
          console.error('Failed to recreate window:', error);
          dialog.showErrorBox('Error', 'Failed to create window. Please restart the app.');
        }
      }
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start application: ${(error as Error).message}`
    );
    app.quit();
  }
});

app.on('render-process-gone', (_event, _webContents, details) => {
  console.error('Renderer process crashed:', details);

  dialog
    .showMessageBox({
      type: 'error',
      title: 'Application Crashed',
      message: 'The application has crashed',
      detail: 'Would you like to restart?',
      buttons: ['Restart', 'Quit']
    })
    .then((result) => {
      if (result.response === 0) {
        app.relaunch();
        app.quit();
      } else {
        app.quit();
      }
    });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function enableHotReload(): void {
  if (!app.isPackaged) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
        forceHardReset: true,
        hardResetMethod: 'exit'
      });
    } catch (err) {
      console.error('Failed to enable hot reload:', err);
    }
  }
}
