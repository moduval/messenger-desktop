import { type WebContents } from 'electron';

export class CssInjector {
  static injectCleanUi(webContents: WebContents): void {
    webContents
      .insertCSS(
        `
          /* Hide "Install Desktop App" banners */
          div[aria-label="Install desktop app"] {
            display: none !important;
          }
          /* Hide Facebook top navigation bar */
          div[role="banner"],
          div[aria-label="Facebook"] {
            display: none !important;
          }
          /* Remove top padding that compensated for the fixed navbar */
          body {
            padding-top: 0 !important;
          }
          /* Zero out the header height variable on every element so class-level
             overrides (e.g. .x85a59c { --header-height: 56px }) cannot win */
          * {
            --header-height: 0px !important;
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
