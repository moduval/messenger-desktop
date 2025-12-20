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
        sandbox: true,
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

    win.on('closed', () => {
      this.instance = null;
    });

    this.instance = win;
    return win;
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

  private static handleExternalLink(url: string): void {
    try {
      const urlObj = new URL(url);
      // Only open http/https links externally
      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
        shell.openExternal(url).catch(err => {
          console.error('Failed to open external URL:', err);
        });
      }
    } catch (err) {
      console.error('Invalid external URL:', url, err);
    }
  }
}
