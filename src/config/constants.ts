import * as path from 'path';

export const APP_CONFIG = {
  APP: {
    ID: 'com.arivest.messenger-desktop',
    NAME: 'Messenger'
  },
  WINDOW: {
    WIDTH: 1200,
    HEIGHT: 800,
    ICON_PATH: path.join(__dirname, '../../assets/icon.png')
  },
  URLS: {
    MESSENGER: 'https://www.messenger.com/'
  },
  PATHS: {
    PRELOAD: path.join(__dirname, '../preload.js'),
    ASSETS: path.join(__dirname, '../../assets')
  }
};
