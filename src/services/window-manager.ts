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
    SplashScreen.show();

    const messengerSession = this.initializeSession();
    const savedState = this.getWindowState();
    const browserWindow = this.createBrowserWindow(messengerSession, savedState);

    this.setupLoadHandlers(browserWindow);
    this.setupNavigationHandlers(browserWindow);
    this.setupLifecycleHandlers(browserWindow);

    this.instance = browserWindow;
    return browserWindow;
  }

  private static initializeSession(): Electron.Session {
    return session.fromPartition('persist:messenger');
  }

  private static getWindowState(): WindowState {
    return store.get('windowState', {
      width: APP_CONFIG.WINDOW.WIDTH,
      height: APP_CONFIG.WINDOW.HEIGHT,
      isMaximized: false
    });
  }

  private static createBrowserWindow(
    messengerSession: Electron.Session,
    savedState: WindowState
  ): BrowserWindow {
    const browserWindow = new BrowserWindow({
      width: savedState.width,
      height: savedState.height,
      x: savedState.x,
      y: savedState.y,
      show: false,
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

    return browserWindow;
  }

  private static setupReadyToShowHandler(browserWindow: BrowserWindow): void {
    browserWindow.once('ready-to-show', () => {
      SplashScreen.close();
      browserWindow.show();
      browserWindow.focus();
    });
  }

  private static setupFinishLoadHandler(browserWindow: BrowserWindow): void {
    browserWindow.webContents.on('did-finish-load', () => {
      SplashScreen.close();
      CssInjector.injectCleanUi(browserWindow.webContents);
    });
  }

  private static setupFailLoadHandler(browserWindow: BrowserWindow): void {
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
  }

  private static setupLoadHandlers(browserWindow: BrowserWindow): void {
    this.setupReadyToShowHandler(browserWindow);
    this.setupFinishLoadHandler(browserWindow);
    this.setupFailLoadHandler(browserWindow);

    browserWindow.loadURL(APP_CONFIG.URLS.MESSENGER).catch((error) => {
      if (ErrorUtils.isAbortedError(error)) {
        return;
      }
      console.error('Failed to load Messenger:', error);
    });
  }

  private static setupNavigationHandlers(browserWindow: BrowserWindow): void {
    this.handleExternalLinks(browserWindow);
    this.handleInternalNavigation(browserWindow);
  }

  private static setupLifecycleHandlers(browserWindow: BrowserWindow): void {
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
  }

  private static saveWindowState(browserWindow: BrowserWindow): void {
    if (!browserWindow.isDestroyed()) {
      const bounds = browserWindow.getBounds();
      store.set('windowState', {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: browserWindow.isMaximized()
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

  private static handleInternalNavigation(
    browserWindow: Electron.CrossProcessExports.BrowserWindow
  ) {
    browserWindow.webContents.on('will-navigate', (event, url) => {
      if (!this.isAllowedUrl(url)) {
        event.preventDefault();
        this.handleExternalLink(url);
      }
    });
  }

  private static handleExternalLinks(browserWindow: Electron.CrossProcessExports.BrowserWindow) {
    browserWindow.webContents.setWindowOpenHandler(({ url }) => {
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
