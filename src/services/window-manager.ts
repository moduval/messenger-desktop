import { BrowserWindow, shell, session, dialog, app, Tray, Menu, nativeImage } from 'electron';
import Store from 'electron-store';
import { APP_CONFIG } from '../config/constants';
import { CssInjector } from '../utils/css-injector';
import { SplashScreen } from './splash-screen';
import * as fs from 'fs';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

const store = new Store<{ windowState: WindowState }>();

let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

export class WindowManager {
  private static instance: BrowserWindow | null = null;

  static create(): BrowserWindow {
    if (this.instance && !this.instance.isDestroyed()) {
      this.instance.show();
      this.instance.focus();
      return this.instance;
    }

    this.validatePreloadScript();

    const messengerSession = session.fromPartition('persist:messenger');

    const savedState = store.get('windowState', {
      width: APP_CONFIG.WINDOW.WIDTH,
      height: APP_CONFIG.WINDOW.HEIGHT,
      isMaximized: false
    });

    SplashScreen.show();

    const win = new BrowserWindow({
      width: savedState.width,
      height: savedState.height,
      x: savedState.x,
      y: savedState.y,
      show: false, // Don't show until ready
      icon: APP_CONFIG.WINDOW.ICON_PATH,
      webPreferences: {
        session: messengerSession,
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
        preload: APP_CONFIG.PATHS.PRELOAD
      }
    });

    if (savedState.isMaximized) {
      win.maximize();
    }

    win.once('ready-to-show', () => {
      SplashScreen.close();
      win.show();
      win.focus();
    });

    win.webContents.on('did-finish-load', () => {
      CssInjector.injectCleanUi(win.webContents);
    });

    win.loadURL(APP_CONFIG.URLS.MESSENGER).catch((error) => {
      console.error('Failed to load Messenger:', error);
      dialog
        .showMessageBox(win, {
          type: 'error',
          title: 'Connection Error',
          message: 'Failed to load Messenger',
          detail: 'Please check your internet connection and try again.',
          buttons: ['Retry', 'Quit']
        })
        .then((result) => {
          if (result.response === 0) {
            win.loadURL(APP_CONFIG.URLS.MESSENGER);
          } else {
            app.quit();
          }
        });
    });

    this.setupWindowHandlers(win);

    win.on('close', (event) => {
      if (!isQuitting && process.platform !== 'darwin') {
        event.preventDefault();
        win.hide();
      }
      this.saveWindowState(win);
    });

    win.on('closed', () => {
      this.cleanup();
    });

    this.instance = win;
    return win;
  }

  private static saveWindowState(win: BrowserWindow): void {
    if (!win.isDestroyed()) {
      const bounds = win.getBounds();
      store.set('windowState', {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: win.isMaximized()
      });
    }
  }

  private static cleanup(): void {
    if (this.instance && !this.instance.isDestroyed()) {
      this.instance.removeAllListeners();
      this.instance = null;
    }
  }

  private static isAllowedUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
        return false;
      }

      return hostname === 'www.messenger.com' || hostname.endsWith('.messenger.com');
    } catch (err) {
      console.error('Invalid URL:', url, err);
      return false;
    }
  }

  private static setupWindowHandlers(win: BrowserWindow): void {
    // Handle external links
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (this.isAllowedUrl(url)) {
        return { action: 'allow' };
      }

      this.handleExternalLink(url);
      return { action: 'deny' };
    });

    // Handle internal navigation
    win.webContents.on('will-navigate', (event, url) => {
      if (!this.isAllowedUrl(url)) {
        event.preventDefault();
        this.handleExternalLink(url);
      }
    });
  }

  private static handleExternalLink(url: string): void {
    try {
      const urlObj = new URL(url);
      if (this.isValidExternalProtocol(urlObj.protocol)) {
        shell.openExternal(url).catch((err) => {
          console.error('Failed to open external URL:', err);
        });
      }
    } catch (err) {
      console.error('Invalid external URL:', url, err);
    }
  }

  private static isValidExternalProtocol(protocol: string): boolean {
    return protocol === 'http:' || protocol === 'https:';
  }

  private static validatePreloadScript(): void {
    if (!fs.existsSync(APP_CONFIG.PATHS.PRELOAD)) {
      throw new Error(`Preload script not found at ${APP_CONFIG.PATHS.PRELOAD}`);
    }
  }
}
