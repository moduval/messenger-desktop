import { BrowserWindow, shell } from 'electron';
import { APP_CONFIG } from '../config/constants';
import { CssInjector } from '../utils/css-injector';

export class WindowManager {
  private static instance: BrowserWindow | null = null;

  static create(): BrowserWindow {
    if (this.instance) {
      return this.instance;
    }

    const win = new BrowserWindow({
      width: APP_CONFIG.WINDOW.WIDTH,
      height: APP_CONFIG.WINDOW.HEIGHT,
      icon: APP_CONFIG.WINDOW.ICON_PATH,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: APP_CONFIG.PATHS.PRELOAD,
      },
    });

    win.webContents.on('did-finish-load', () => {
      CssInjector.injectCleanUi(win.webContents);
    });

    void win.loadURL(APP_CONFIG.URLS.MESSENGER);

    // Handle external links
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith(APP_CONFIG.URLS.MESSENGER)) {
        return { action: 'allow' };
      }
      shell.openExternal(url);
      return { action: 'deny' };
    });

    win.on('closed', () => {
      this.instance = null;
    });

    this.instance = win;
    return win;
  }
}
