import * as path from 'path';

export const APP_CONFIG = {
  WINDOW: {
    WIDTH: 1200,
    HEIGHT: 800,
    ICON_PATH: path.join(__dirname, '../../assets/icon.png')
  },
  URLS: {
    MESSENGER: 'https://www.messenger.com/',
    ALLOWED_ORIGINS: ['https://*.messenger.com', 'https://*.facebook.com', 'https://*.fbcdn.net']
  },
  PATHS: {
    PRELOAD: path.join(__dirname, '../preload.js'),
    ASSETS: path.join(__dirname, '../../assets')
  }
};
