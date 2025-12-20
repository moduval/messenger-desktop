import 'v8-compile-cache';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
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
