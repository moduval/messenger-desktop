import { WebContents } from 'electron';

export class CssInjector {
  static injectCleanUi(webContents: WebContents): void {
    void webContents.insertCSS(`
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
  }
}
