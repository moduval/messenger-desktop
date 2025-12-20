import 'v8-compile-cache';
import { app, BrowserWindow, shell, ipcMain, session } from 'electron';
import * as path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Optimization: Inject CSS to hide clutter (e.g., "Install App" banners)
  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      /* Hide "Install Desktop App" banners if possible */
      div[aria-label="Install desktop app"],
      div[role="banner"] {
        display: none !important;
      }
      /* Hide scrollbars for cleaner look */
      ::-webkit-scrollbar {
        display: none;
      }
    `);
  });

  win.loadURL('https://www.messenger.com/');

  // Handle badge updates
  ipcMain.on('update-badge', (event, count) => {
    if (process.platform === 'darwin' && app.dock) {
      if (count) {
        app.dock.setBadge(count.toString());
      } else {
        app.dock.setBadge('');
      }
    }
  });


  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://www.messenger.com/')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // Security: Set Content Security Policy (CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' https://*.messenger.com https://*.facebook.com https://*.fbcdn.net; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.messenger.com https://*.facebook.com https://*.fbcdn.net; style-src 'self' 'unsafe-inline' https://*.messenger.com https://*.facebook.com https://*.fbcdn.net; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https: wss:;"
        ]
      }
    });
  });

  if (process.platform === 'darwin') {
    app.dock?.setIcon(path.join(__dirname, '../assets/icon.png'));
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
