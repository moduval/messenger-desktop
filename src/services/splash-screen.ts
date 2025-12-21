import { BrowserWindow } from 'electron';
import { APP_CONFIG } from '../config/constants';
import * as path from 'path';

export class SplashScreen {
  private static instance: BrowserWindow | null = null;

  static show(): void {
    if (this.instance && !this.instance.isDestroyed()) {
      this.instance.show();
      this.instance.focus();
      return;
    }

    this.instance = new BrowserWindow({
      width: 300,
      height: 300,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      icon: APP_CONFIG.WINDOW.ICON_PATH,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    void this.instance.loadFile(path.join(__dirname, '../../assets/splash.html'));
  }

  static close(): void {
    if (this.instance && !this.instance.isDestroyed()) {
      this.instance.destroy();
      this.instance = null;
    }
  }
}
