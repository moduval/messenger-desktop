import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Application Launch', () => {
  test('should launch the application and load Messenger', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '..')],
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    const title = await window.title();
    console.log(`Window title: ${title}`);
    expect(title).toContain('Messenger');

    const url = window.url();
    console.log(`Window URL: ${url}`);
    expect(url).toContain('messenger.com');

    await electronApp.close();
  });
});
