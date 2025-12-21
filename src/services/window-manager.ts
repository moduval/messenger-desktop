import { BrowserWindow, shell, session, dialog, app, Tray, Menu, nativeImage } from 'electron';
import Store from 'electron-store';
import { APP_CONFIG } from '../config/constants';
import { CssInjector } from '../utils/css-injector';
import { ErrorUtils } from '../utils/error-utils';
import { SplashScreen } from './splash-screen';
import * as fs from 'fs';
import * as path from 'path';

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

    const browserWindow = new BrowserWindow({
      width: savedState.width,
      height: savedState.height,
      x: savedState.x,
      y: savedState.y,
      show: false, // Don't show until ready
      icon: APP_CONFIG.WINDOW.ICON_PATH,
      webPreferences: {
        session: messengerSession,
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        preload: APP_CONFIG.PATHS.PRELOAD
      }
    });

    if (savedState.isMaximized) {
      browserWindow.maximize();
    }

    browserWindow.once('ready-to-show', () => {
      SplashScreen.close();
      browserWindow.show();
      browserWindow.focus();
    });

    browserWindow.webContents.on('did-finish-load', () => {
      SplashScreen.close();
      CssInjector.injectCleanUi(browserWindow.webContents);
    });

    browserWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
        if (!isMainFrame) return;

        console.error('Failed to load:', errorCode, errorDescription);
        if (ErrorUtils.isOfflineError(errorCode)) {
          void browserWindow.loadFile(path.join(APP_CONFIG.PATHS.ASSETS, 'offline.html'));
        }
      }
    );

    browserWindow.loadURL(APP_CONFIG.URLS.MESSENGER).catch((error) => {
      if (ErrorUtils.isAbortedError(error)) {
        return;
      }
      console.error('Failed to load Messenger:', error);
    });

    this.handleExternalLinks(browserWindow);
    this.handleInternalNavigation(browserWindow);

    browserWindow.on('close', (event) => {
      if (!isQuitting && process.platform !== 'darwin') {
        event.preventDefault();
        browserWindow.hide();
      }
      this.saveWindowState(browserWindow);
    });

    browserWindow.on('closed', () => {
      this.cleanup();
    });

    this.instance = browserWindow;
    return browserWindow;
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

  private static handleInternalNavigation(win: Electron.CrossProcessExports.BrowserWindow) {
    win.webContents.on('will-navigate', (event, url) => {
      if (!this.isAllowedUrl(url)) {
        event.preventDefault();
        this.handleExternalLink(url);
      }
    });
  }

  private static handleExternalLinks(win: Electron.CrossProcessExports.BrowserWindow) {
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (this.isAllowedUrl(url)) {
        return { action: 'allow' };
      }

      this.handleExternalLink(url);
      return { action: 'deny' };
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
