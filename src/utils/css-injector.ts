import { type WebContents } from 'electron';

export class CssInjector {
  static injectCleanUi(webContents: WebContents): void {
    webContents
      .insertCSS(
        `
          /* Hide "Install Desktop App" banners if possible */
          div[aria-label="Install desktop app"],
          div[role="banner"] {
            display: none !important;
          }
          /* Hide scrollbars for cleaner look */
          ::-webkit-scrollbar {
            display: none;
          }
        `
      )
      .catch((error) => {
        console.error('Failed to inject CSS:', error);
      });
  }
}
