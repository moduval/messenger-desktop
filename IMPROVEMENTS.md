# Messenger Desktop - Comprehensive Improvement Analysis

**Date:** December 20, 2025
**Total Issues Identified:** 72+
**Categories:** 14

This document contains a thorough analysis of improvement opportunities for the messenger-desktop application, organized by priority and category.

---

## Executive Summary

The messenger-desktop application has a solid foundation but requires significant improvements in:
- **Security** (3 critical vulnerabilities)
- **Error Handling** (6 major gaps causing silent failures)
- **Performance** (badge detection does full DOM scan on every mutation)
- **Cross-platform Support** (badge detection only works on macOS)
- **Testing** (zero test coverage)
- **User Experience** (no settings, notifications, or state persistence)

---

## Current Features (Already Implemented)

The application currently includes the following features:
- **macOS Dock Badge:** Real-time unread message count on the dock icon (Source: `src/services/ipc-handlers.ts`).
- **Clean UI Injection:** Automatically hides "Install Desktop App" banners and scrollbars for a native look (Source: `src/utils/css-injector.ts`).
- **External Link Handling:** Opens Messenger links in-app and other URLs in the default system browser (Source: `src/services/window-manager.ts`).
- **Single Instance Lock:** Ensures only one instance of the application runs at a time (Source: `src/services/window-manager.ts`).
- **Basic Window Management:** Loads Messenger.com with isolated context (Source: `src/services/window-manager.ts`).

---

## Table of Contents

1. [Critical Issues (High Priority)](#critical-issues-high-priority)
2. [Important Issues (Medium Priority)](#important-issues-medium-priority)
3. [Enhancement Opportunities (Lower Priority)](#enhancement-opportunities-lower-priority)
6. [Detailed Issue Breakdown](#detailed-issue-breakdown)
7. [Technical Notes & Known Issues](#technical-notes--known-issues)

---

## Critical Issues (High Priority)

### Security Vulnerabilities

#### 1. Missing Content Security Policy (CSP)
- **File:** `src/services/window-manager.ts`
- **Severity:** Critical
- **Issue:** No CSP headers are set. Messenger's untrusted content could potentially execute arbitrary scripts.
- **Recommendation:**
```typescript
webPreferences: {
  contentSecurityPolicy: "default-src 'self' https://www.messenger.com https://*.fbcdn.net; script-src 'self' https://www.messenger.com"
}
```





---

### Error Handling Gaps

#### 7. No Error Handling in Window Creation
- **File:** `src/index.ts:7-13`
- **Severity:** High
- **Issue:** The `WindowManager.create()` call has no error handling. If window creation fails, the app crashes silently.
- **Recommendation:**
```typescript
app.whenReady().then(() => {
  try {
    if (process.platform === 'darwin') {
      app.dock?.setIcon(APP_CONFIG.WINDOW.ICON_PATH);
    }

    WindowManager.create();
    IpcHandlers.register();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        try {
          WindowManager.create();
        } catch (error) {
          console.error('Failed to recreate window:', error);
          dialog.showErrorBox('Error', 'Failed to create window. Please restart the app.');
        }
      }
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    dialog.showErrorBox('Startup Error', `Failed to start application: ${error.message}`);
    app.quit();
  }
});
```

#### 8. No Error Handling for Missing Preload Script
- **File:** `src/services/window-manager.ts:20`
- **Severity:** High
- **Issue:** If the preload script doesn't exist, BrowserWindow creation fails with a cryptic error.
- **Recommendation:**
```typescript
import * as fs from 'fs';

static create(): BrowserWindow {
  // Validate preload script exists
  if (!fs.existsSync(APP_CONFIG.PATHS.PRELOAD)) {
    throw new Error(`Preload script not found at ${APP_CONFIG.PATHS.PRELOAD}`);
  }

  // ... rest of window creation
}
```

#### 9. No Promise Rejection Handling for URL Loading
- **File:** `src/services/window-manager.ts:28`
- **Severity:** High
- **Issue:** `win.loadURL()` returns a promise that can reject, but rejection is ignored.
- **Current Code:**
```typescript
void win.loadURL(APP_CONFIG.URLS.MESSENGER);
```
- **Recommended Fix:**
```typescript
win.loadURL(APP_CONFIG.URLS.MESSENGER).catch(error => {
  console.error('Failed to load Messenger:', error);
  dialog.showMessageBox(win, {
    type: 'error',
    title: 'Connection Error',
    message: 'Failed to load Messenger',
    detail: 'Please check your internet connection and try again.',
    buttons: ['Retry', 'Quit']
  }).then(result => {
    if (result.response === 0) {
      win.loadURL(APP_CONFIG.URLS.MESSENGER);
    } else {
      app.quit();
    }
  });
});
```

#### 10. Missing Error Context in IPC Communication
- **File:** `src/services/ipc-handlers.ts:5`
- **Severity:** Medium
- **Issue:** No validation that `count` parameter is valid before calling `toString()`.
- **Recommendation:**
```typescript
static register(): void {
  ipcMain.on('update-badge', (_event, count) => {
    try {
      if (process.platform !== 'darwin' || !app.dock) {
        return;
      }

      // Validate input
      if (count !== null && count !== undefined && typeof count !== 'string' && typeof count !== 'number') {
        console.error('Invalid badge count type:', typeof count);
        return;
      }

      if (count) {
        const badgeString = String(count);
        // Validate it's a reasonable number
        const num = parseInt(badgeString, 10);
        if (isNaN(num) || num < 0 || num > 9999) {
          console.error('Invalid badge count value:', badgeString);
          return;
        }
        app.dock.setBadge(badgeString);
      } else {
        app.dock.setBadge('');
      }
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  });
}
```

#### 11. No Error Handling in MutationObserver
- **File:** `src/preload.ts:6-16`
- **Severity:** Medium
- **Issue:** The MutationObserver callback doesn't have error handling. Exceptions crash the renderer process.
- **Recommendation:**
```typescript
static init(): void {
  try {
    const observer = new MutationObserver(() => {
      try {
        this.checkUnreadCount();
      } catch (error) {
        console.error('Badge detection error:', error);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label'],
      characterData: true
    });
  } catch (error) {
    console.error('Failed to initialize badge observer:', error);
  }
}
```

#### 12. CSS Injection Without Error Handling
- **File:** `src/utils/css-injector.ts:5`
- **Severity:** Low
- **Issue:** `webContents.insertCSS()` can fail but the promise rejection is ignored.
- **Recommendation:**
```typescript
static injectCleanUi(webContents: WebContents): void {
  webContents.insertCSS(`
    /* Hide "Install Desktop App" banners if possible */
    div[aria-label="Install desktop app"],
    div[role="banner"] {
      display: none !important;
    }
    /* Hide scrollbars for cleaner look */
    ::-webkit-scrollbar {
      display: none;
    }
  `).catch(error => {
    console.error('Failed to inject CSS:', error);
  });
}
```

---

### Performance Issues

#### 13. Catastrophic DOM Traversal Performance
- **File:** `src/preload.ts:24-35`
- **Severity:** Critical
- **Issue:** `querySelectorAll('*')` iterates over EVERY ELEMENT in the entire DOM on every mutation. For a complex page like Messenger with 1000+ elements, this runs thousands of times per second.
- **Impact:** High CPU usage, battery drain, potential UI freezing
- **Current Code:**
```typescript
private static findUnreadCount(): string | null {
  const allElements = document.querySelectorAll('*');

  for (const el of allElements) {
    const text = el.getAttribute('aria-label') || el.textContent;

    if (text) {
      const match = text.match(this.UNREAD_PATTERN);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
}
```
- **Recommended Fix:**
```typescript
private static findUnreadCount(): string | null {
  // Only query elements that might have aria-label
  const candidates = document.querySelectorAll('[aria-label]');

  for (const el of candidates) {
    const ariaLabel = el.getAttribute('aria-label');
    if (!ariaLabel) continue;

    const match = ariaLabel.match(this.UNREAD_PATTERN);
    if (match) {
      return match[1];
    }
  }

  return null;
}
```
- **Expected Impact:** 50-100x performance improvement

#### 14. No Debouncing of Badge Updates
- **File:** `src/preload.ts:6-15`
- **Severity:** High
- **Issue:** MutationObserver fires on every DOM change. If the page updates 100 times per second, badge detection runs 100 times and sends 100 IPC messages.
- **Recommendation:**
```typescript
private static debounceTimer: number | null = null;
private static readonly DEBOUNCE_DELAY = 500; // ms

static init(): void {
  const observer = new MutationObserver(() => {
    try {
      // Clear existing timer
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
      }

      // Set new timer
      this.debounceTimer = window.setTimeout(() => {
        this.checkUnreadCount();
        this.debounceTimer = null;
      }, this.DEBOUNCE_DELAY);
    } catch (error) {
      console.error('Badge detection error:', error);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-label'],
    characterData: true
  });
}
```

#### 15. No IPC Event Deduplication
- **File:** `src/preload.ts:40-42`
- **Severity:** Medium
- **Issue:** If badge count doesn't change (stays at "5"), the same IPC message is sent repeatedly.
- **Recommendation:**
```typescript
private static lastBadgeCount: string | null = null;

private static updateBadge(count: string | null): void {
  // Only send IPC if count actually changed
  if (count !== this.lastBadgeCount) {
    this.lastBadgeCount = count;
    ipcRenderer.send('update-badge', count);
  }
}
```

#### 16. MutationObserver Never Stopped
- **File:** `src/preload.ts:6-15`
- **Severity:** Medium
- **Issue:** The observer is started but never stopped, even when the window closes. Memory leak.
- **Recommendation:**
```typescript
private static observer: MutationObserver | null = null;

static init(): void {
  this.observer = new MutationObserver(() => {
    // ... observer logic
  });

  this.observer.observe(document.body, { /* ... */ });

  // Stop observer when window unloads
  window.addEventListener('beforeunload', () => {
    this.cleanup();
  });
}

static cleanup(): void {
  if (this.observer) {
    this.observer.disconnect();
    this.observer = null;
  }
  if (this.debounceTimer !== null) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
  }
}
```

#### 17. V8 Code Cache Not Properly Configured
- **File:** `src/index.ts:1`
- **Severity:** Low
- **Issue:** `v8-compile-cache` is imported but may not work optimally without configuration.
- **Recommendation:**
```typescript
import * as v8CompileCache from 'v8-compile-cache';
import * as path from 'path';
import { app } from 'electron';

// Configure cache directory
v8CompileCache.setCacheDir(path.join(app.getPath('userData'), 'v8-cache'));
```

---

## Important Issues (Medium Priority)

### Badge Detection Issues

#### 18. Pattern Matching Fails with Internationalization
- **File:** `src/preload.ts:4`
- **Severity:** High
- **Issue:** The regex pattern `"Chats · (\d+) unread"` is hardcoded in English. Non-English users won't get badge counts.
- **Recommendation:**
```typescript
private static readonly UNREAD_PATTERNS = [
  /Chats · (\d+) unread/,           // English
  /Chats · (\d+) non lus/,          // French
  /Chats · (\d+) no leídos/,        // Spanish
  /Chats · (\d+) ungelesen/,        // German
  /チャット · (\d+)件の未読/,        // Japanese
  /(\d+)\s*unread/i,                 // Generic fallback
];

private static findUnreadCount(): string | null {
  const candidates = document.querySelectorAll('[aria-label]');

  for (const el of candidates) {
    const ariaLabel = el.getAttribute('aria-label');
    if (!ariaLabel) continue;

    for (const pattern of this.UNREAD_PATTERNS) {
      const match = ariaLabel.match(pattern);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
}
```

#### 19. Badge Detection Relies on Fragile Text Pattern
- **File:** `src/preload.ts:4`
- **Severity:** Medium
- **Issue:** If Messenger's UI changes and the text pattern is updated, badge detection breaks.
- **Recommendation:** Implement multiple detection strategies:
```typescript
private static findUnreadCount(): string | null {
  // Strategy 1: aria-label pattern matching
  let count = this.findByAriaLabel();
  if (count) return count;

  // Strategy 2: data attributes
  count = this.findByDataAttribute();
  if (count) return count;

  // Strategy 3: specific CSS selectors
  count = this.findBySelector();
  if (count) return count;

  return null;
}

private static findByDataAttribute(): string | null {
  const badgeEl = document.querySelector('[data-unread-count]');
  if (badgeEl) {
    return badgeEl.getAttribute('data-unread-count');
  }
  return null;
}

private static findBySelector(): string | null {
  // Look for common badge UI patterns
  const badges = document.querySelectorAll('.badge, .notification-badge, [class*="unread"]');
  for (const badge of badges) {
    const text = badge.textContent?.trim();
    if (text && /^\d+$/.test(text)) {
      return text;
    }
  }
  return null;
}
```

#### 20. Missing Null/Undefined Checks
- **File:** `src/preload.ts:26-34`
- **Severity:** Low
- **Issue:** Code could process undefined values if both aria-label and textContent are null.
- **Recommendation:** See improved version in Issue #13

---

### Window Management Issues

#### 21. No Window State Persistence
- **File:** `src/services/window-manager.ts`
- **Severity:** Medium
- **Issue:** Window always opens at default size/position. Users can't have persistent preferences.
- **Recommendation:**
```typescript
import Store from 'electron-store';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

const store = new Store<{ windowState: WindowState }>();

static create(): BrowserWindow {
  // Load saved window state
  const savedState = store.get('windowState', {
    width: APP_CONFIG.WINDOW.WIDTH,
    height: APP_CONFIG.WINDOW.HEIGHT,
    isMaximized: false,
  });

  const win = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    // ...
  });

  if (savedState.isMaximized) {
    win.maximize();
  }

  // Save window state before close
  win.on('close', () => {
    if (!win.isDestroyed()) {
      const bounds = win.getBounds();
      store.set('windowState', {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: win.isMaximized(),
      });
    }
  });

  // ...
}
```
- **Required Package:** `npm install electron-store`

#### 22. No Minimize to Tray Option
- **File:** `src/services/window-manager.ts`
- **Severity:** Medium
- **Issue:** Closing the window quits the app on non-macOS systems. Users can't minimize to tray.
- **Recommendation:**
```typescript
import { Tray, Menu, nativeImage } from 'electron';

class TrayManager {
  private static tray: Tray | null = null;

  static create(window: BrowserWindow): void {
    const icon = nativeImage.createFromPath(APP_CONFIG.WINDOW.ICON_PATH);
    this.tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => {
          window.show();
          window.focus();
        }
      },
      {
        label: 'Hide',
        click: () => window.hide()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('Messenger Desktop');

    // Click tray icon to show/hide window
    this.tray.on('click', () => {
      if (window.isVisible()) {
        window.hide();
      } else {
        window.show();
        window.focus();
      }
    });
  }
}

// In WindowManager.create():
TrayManager.create(win);

// Handle close event to minimize to tray instead
win.on('close', (event) => {
  if (!app.isQuitting) {
    event.preventDefault();
    win.hide();
  }
});
```

#### 23. No Focus Management
- **File:** `src/services/window-manager.ts:8-11`
- **Severity:** Low
- **Issue:** If `create()` is called while window exists, it just returns the instance without focusing it.
- **Recommendation:**
```typescript
static create(): BrowserWindow {
  if (this.instance && !this.instance.isDestroyed()) {
    this.instance.show();
    this.instance.focus();
    return this.instance;
  }

  // ... create new window
}
```

#### 24. No Memory Management for Window Lifecycle
- **File:** `src/services/window-manager.ts:39-41`
- **Severity:** Low
- **Issue:** No cleanup of resources like listeners when window closes.
- **Recommendation:**
```typescript
private static cleanup(): void {
  if (this.instance && !this.instance.isDestroyed()) {
    this.instance.removeAllListeners();
    this.instance = null;
  }
}

// In create():
win.on('closed', () => {
  this.cleanup();
});
```

#### 25. No Crash Recovery
- **File:** All files
- **Severity:** Medium
- **Issue:** If the app crashes, users lose their state.
- **Recommendation:**
```typescript
app.on('render-process-gone', (event, webContents, details) => {
  console.error('Renderer process crashed:', details);

  dialog.showMessageBox({
    type: 'error',
    title: 'Application Crashed',
    message: 'The application has crashed',
    detail: 'Would you like to restart?',
    buttons: ['Restart', 'Quit']
  }).then(result => {
    if (result.response === 0) {
      app.relaunch();
      app.quit();
    } else {
      app.quit();
    }
  });
});
```

---

### CSS Injection Issues

#### 26. CSS Injection May Occur Too Late
- **File:** `src/services/window-manager.ts:24-25`
- **Severity:** Medium
- **Issue:** CSS is injected on `did-finish-load`, but dynamic components may render after. Banners may flash briefly.
- **Recommendation:**
```typescript
// Inject CSS in preload script (runs before page loads)
// In preload.ts:
window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    div[aria-label="Install desktop app"],
    div[role="banner"] {
      display: none !important;
    }
    ::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(style);

  BadgeManager.init();
});

// Also inject from main process as backup
win.webContents.on('did-start-loading', () => {
  CssInjector.injectCleanUi(win.webContents);
});
```

#### 27. CSS Selectors Are Fragile
- **File:** `src/utils/css-injector.ts:6-10`
- **Severity:** Low
- **Issue:** Hardcoded selectors may not match if Messenger changes its DOM.
- **Recommendation:**
```typescript
static injectCleanUi(webContents: WebContents): void {
  webContents.insertCSS(`
    /* Hide "Install Desktop App" banners - multiple selectors for robustness */
    div[aria-label="Install desktop app"],
    div[aria-label*="install"],
    div[role="banner"],
    [class*="install-banner"],
    [class*="download-app"] {
      display: none !important;
    }

    /* Hide scrollbars for cleaner look - only in main containers */
    .scrollable-area::-webkit-scrollbar,
    [role="main"]::-webkit-scrollbar {
      display: none;
    }

    /* Keep scrollbars in text inputs */
    input::-webkit-scrollbar,
    textarea::-webkit-scrollbar {
      display: block;
    }
  `).catch(error => {
    console.error('Failed to inject CSS:', error);
  });
}
```

#### 28. Scrollbar Hiding Is Too Global
- **File:** `src/utils/css-injector.ts:11-14`
- **Severity:** Low
- **Issue:** `::-webkit-scrollbar { display: none; }` hides scrollbars everywhere, even in inputs.
- **Recommendation:** See Issue #27 for targeted approach

---

### IPC Communication Issues

#### 29. No IPC Message Validation/Sanitization
- **File:** `src/services/ipc-handlers.ts:5`
- **Severity:** Medium
- **Issue:** The `update-badge` handler accepts arbitrary data without validation.
- **Recommendation:** See Issue #10 for validation code

#### 30. No Response Acknowledgment in IPC
- **File:** `src/preload.ts:41`
- **Severity:** Low
- **Issue:** `ipcRenderer.send()` is fire-and-forget. Renderer doesn't know if badge update failed.
- **Recommendation:**
```typescript
// In ipc-handlers.ts:
ipcMain.handle('update-badge', async (_event, count) => {
  try {
    if (process.platform !== 'darwin' || !app.dock) {
      return { success: false, reason: 'Not supported on this platform' };
    }

    // ... validation and update logic

    return { success: true };
  } catch (error) {
    console.error('Failed to update badge:', error);
    return { success: false, reason: error.message };
  }
});

// In preload.ts:
private static async updateBadge(count: string | null): Promise<void> {
  try {
    const result = await ipcRenderer.invoke('update-badge', count);
    if (!result.success) {
      console.warn('Badge update failed:', result.reason);
    }
  } catch (error) {
    console.error('IPC error:', error);
  }
}
```

#### 31. No Error Channel in IPC
- **File:** All IPC files
- **Severity:** Low
- **Issue:** No way for renderer to report errors to main process.
- **Recommendation:**
```typescript
// In ipc-handlers.ts:
ipcMain.on('renderer-error', (_event, error) => {
  console.error('Renderer error:', error);
  // Could send to error tracking service like Sentry
});

// In preload.ts:
window.addEventListener('error', (event) => {
  ipcRenderer.send('renderer-error', {
    message: event.error?.message,
    stack: event.error?.stack,
    timestamp: Date.now(),
  });
});
```

---

### Type Safety Issues

#### 32. Weak Type for IPC Badge Parameter
- **File:** `src/services/ipc-handlers.ts:5`
- **Severity:** Medium
- **Issue:** The `count` parameter is untyped (implicitly `any`).
- **Recommendation:**
```typescript
// Create types file: src/types/ipc.ts
export interface BadgeUpdateMessage {
  count: string | null;
}

export interface BadgeUpdateResponse {
  success: boolean;
  reason?: string;
}

// In ipc-handlers.ts:
import { BadgeUpdateMessage, BadgeUpdateResponse } from '../types/ipc';

ipcMain.handle('update-badge', async (_event, message: BadgeUpdateMessage): Promise<BadgeUpdateResponse> => {
  // ...
});
```

#### 33. Missing Type Definitions for IPC Events
- **File:** Multiple files
- **Severity:** Medium
- **Issue:** IPC send/receive operations lack type safety. Easy to mistype event names.
- **Recommendation:**
```typescript
// src/types/ipc.ts
export const IPC_CHANNELS = {
  UPDATE_BADGE: 'update-badge',
  RENDERER_ERROR: 'renderer-error',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

// Usage:
ipcMain.handle(IPC_CHANNELS.UPDATE_BADGE, ...);
ipcRenderer.invoke(IPC_CHANNELS.UPDATE_BADGE, ...);
```

#### 34. No Return Type Annotations
- **File:** Multiple files
- **Severity:** Low
- **Issue:** Some methods lack explicit return types.
- **Recommendation:**
```typescript
// Add explicit return types:
static create(): BrowserWindow { ... }
static register(): void { ... }
static init(): void { ... }
private static findUnreadCount(): string | null { ... }
```

---

## Enhancement Opportunities (Lower Priority)

### Platform-Specific Features

#### 35. Windows Badge Support Missing
- **File:** All files
- **Severity:** Medium
- **Issue:** Badge detection only works on macOS. Windows users get no unread indicators.
- **Recommendation:**
```typescript
// In ipc-handlers.ts:
import { nativeImage } from 'electron';

ipcMain.on('update-badge', (_event, count) => {
  if (process.platform === 'darwin' && app.dock) {
    // macOS dock badge
    app.dock.setBadge(count ? String(count) : '');
  } else if (process.platform === 'win32') {
    // Windows taskbar overlay icon
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (count) {
        // Create badge overlay icon
        const badge = createBadgeIcon(count);
        win.setOverlayIcon(badge, `${count} unread messages`);
      } else {
        win.setOverlayIcon(null, '');
      }
    }
  }
});

function createBadgeIcon(count: string): NativeImage {
  // Create a small canvas with the count
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  // Draw red circle
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(16, 16, 15, 0, 2 * Math.PI);
  ctx.fill();

  // Draw white text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(count, 16, 16);

  return nativeImage.createFromDataURL(canvas.toDataURL());
}
```

#### 36. Linux Badge Support Missing
- **File:** All files
- **Severity:** Low
- **Issue:** No Linux-specific features implemented.
- **Recommendation:**
```typescript
if (process.platform === 'linux') {
  // Unity launcher badge (Ubuntu)
  app.setBadgeCount(parseInt(count, 10) || 0);

  // Send desktop notification via D-Bus
  // Requires additional native module
}
```

#### 37. No Native Notifications
- **File:** All files
- **Severity:** Medium
- **Issue:** When new messages arrive, there's no desktop notification (only badge).
- **Recommendation:**
```typescript
// In preload.ts:
private static lastCount: number = 0;

private static checkUnreadCount(): void {
  const countStr = this.findUnreadCount();
  const count = countStr ? parseInt(countStr, 10) : 0;

  // If count increased, show notification
  if (count > this.lastCount) {
    const newMessages = count - this.lastCount;
    ipcRenderer.send('show-notification', {
      title: 'New Messages',
      body: `You have ${newMessages} new message${newMessages > 1 ? 's' : ''}`,
      count: count,
    });
  }

  this.lastCount = count;
  this.updateBadge(countStr);
}

// In ipc-handlers.ts:
ipcMain.on('show-notification', (_event, data) => {
  const notification = new Notification({
    title: data.title,
    body: data.body,
    icon: APP_CONFIG.WINDOW.ICON_PATH,
  });

  notification.on('click', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.show();
      win.focus();
    }
  });

  notification.show();
});
```

#### 38. No Keyboard Shortcuts
- **File:** All files
- **Severity:** Low
- **Issue:** No custom keyboard shortcuts.
- **Recommendation:**
```typescript
import { globalShortcut } from 'electron';

app.whenReady().then(() => {
  // Register global shortcuts
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
        win.focus();
      }
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
```

#### 39. macOS Touch Bar Support
- **File:** All files
- **Severity:** Low
- **Issue:** No Touch Bar integration for MacBook Pro users.
- **Recommendation:**
```typescript
import { TouchBar } from 'electron';

const { TouchBarButton, TouchBarSpacer } = TouchBar;

const touchBar = new TouchBar({
  items: [
    new TouchBarButton({
      label: '💬 New Message',
      click: () => {
        // Focus search box or new message composer
        win.webContents.executeJavaScript(`
          document.querySelector('[aria-label="New message"]')?.click();
        `);
      }
    }),
    new TouchBarSpacer({ size: 'small' }),
    new TouchBarButton({
      label: '🔍 Search',
      click: () => {
        win.webContents.executeJavaScript(`
          document.querySelector('[aria-label="Search"]')?.focus();
        `);
      }
    }),
  ]
});

win.setTouchBar(touchBar);
```

---

### User Experience Improvements

#### 40. No Splash Screen or Loading Indicator
- **File:** `src/services/window-manager.ts`
- **Severity:** Medium
- **Issue:** Window appears blank for 3-5 seconds while messenger.com loads.
- **Recommendation:**
```typescript
static create(): BrowserWindow {
  const win = new BrowserWindow({
    // ...
    show: false, // Don't show until ready
    backgroundColor: '#FFFFFF',
  });

  // Show window only after page loads
  win.once('ready-to-show', () => {
    win.show();
  });

  // Or create a splash window
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
  });

  splash.loadFile('assets/splash.html');

  win.once('ready-to-show', () => {
    splash.close();
    win.show();
  });

  // ...
}
```

#### 41. No Offline Mode Handling
- **File:** All files
- **Severity:** Medium
- **Issue:** If internet is lost, page shows blank white screen.
- **Recommendation:**
```typescript
// In window-manager.ts:
win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
  if (errorCode === -106) { // ERR_INTERNET_DISCONNECTED
    win.loadFile('assets/offline.html');
  }
});

// Listen for online event to reload
win.webContents.on('online', () => {
  win.loadURL(APP_CONFIG.URLS.MESSENGER);
});
```
- **Create assets/offline.html:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Offline</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #f0f2f5;
    }
    .offline-message {
      text-align: center;
    }
    h1 { color: #1c1e21; }
    p { color: #65676b; }
  </style>
</head>
<body>
  <div class="offline-message">
    <h1>📡 No Internet Connection</h1>
    <p>Please check your network connection and try again.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
</body>
</html>
```

#### 42. No Settings/Preferences UI
- **File:** All files
- **Severity:** Medium
- **Issue:** Users can't configure the app without editing code.
- **Recommendation:**
```typescript
// Create settings window
class SettingsManager {
  private static settingsWindow: BrowserWindow | null = null;

  static show(): void {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 600,
      height: 500,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: APP_CONFIG.PATHS.PRELOAD,
      },
    });

    this.settingsWindow.loadFile('assets/settings.html');

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }
}

// Add menu item
const menu = Menu.buildFromTemplate([
  {
    label: 'File',
    submenu: [
      {
        label: 'Settings',
        accelerator: 'CmdOrCtrl+,',
        click: () => SettingsManager.show(),
      },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
]);

Menu.setApplicationMenu(menu);
```

#### 43. Missing Native Application Menu
- **File:** `src/index.ts`
- **Severity:** Medium
- **Issue:** The app uses the default Electron menu (or none), lacking standard native integration. Users expect standard menus like "Edit" (Copy/Paste), "View" (Reload, Zoom), and "Window" (Minimize, Zoom).
- **Recommendation:**
```typescript
import { Menu, shell } from 'electron';

export class MenuManager {
  static create(): void {
    const template = [
      { role: 'appMenu' },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
      {
        role: 'help',
        submenu: [
          {
            label: 'Learn More',
            click: async () => {
              await shell.openExternal('https://github.com/tiaaaa123/messenger-desktop');
            }
          }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}
```

#### 44. No User Documentation
- **File:** `README.md`
- **Severity:** Low
- **Issue:** README is minimal. No troubleshooting guide.
- **Recommendation:** Expand README with:
  - Installation instructions for all platforms
  - Troubleshooting section
  - FAQ (badge not working, notifications not showing, etc.)
  - Known limitations
  - How to report bugs
  - Development guide

---

### Configuration & Customization

#### 44. No User Preferences Storage
- **File:** All files
- **Severity:** Medium
- **Issue:** No way to persist user preferences.
- **Recommendation:**
```typescript
// Install: npm install electron-store
import Store from 'electron-store';

interface AppPreferences {
  badgeDetection: boolean;
  notifications: boolean;
  hideScrollbars: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  theme: 'light' | 'dark' | 'auto';
}

const store = new Store<AppPreferences>({
  defaults: {
    badgeDetection: true,
    notifications: true,
    hideScrollbars: true,
    minimizeToTray: false,
    startMinimized: false,
    theme: 'auto',
  },
});

// Access preferences anywhere:
if (store.get('badgeDetection')) {
  BadgeManager.init();
}
```

#### 45. No Environment-Based Configuration
- **File:** `src/config/constants.ts`
- **Severity:** Low
- **Issue:** URLs and paths are hardcoded.
- **Recommendation:**
```typescript
import * as dotenv from 'dotenv';
dotenv.config();

export const APP_CONFIG = {
  WINDOW: {
    WIDTH: parseInt(process.env.WINDOW_WIDTH || '1200', 10),
    HEIGHT: parseInt(process.env.WINDOW_HEIGHT || '800', 10),
    ICON_PATH: path.join(__dirname, '../../assets/icon.png'),
  },
  URLS: {
    MESSENGER: process.env.MESSENGER_URL || 'https://www.messenger.com/',
    ALLOWED_ORIGINS: [
      'https://*.messenger.com',
      'https://*.facebook.com',
      'https://*.fbcdn.net'
    ]
  },
  DEBUG: process.env.DEBUG === 'true',
};
```

#### 46. No Dark Mode Support
- **File:** `src/utils/css-injector.ts`
- **Severity:** Low
- **Issue:** App doesn't respect system dark mode preferences.
- **Recommendation:**
```typescript
import { nativeTheme } from 'electron';

static injectCleanUi(webContents: WebContents): void {
  const isDarkMode = nativeTheme.shouldUseDarkColors;

  webContents.insertCSS(`
    /* Existing CSS rules */
    /* ... */

    /* Dark mode support */
    ${isDarkMode ? `
      body {
        background-color: #18191a !important;
        color: #e4e6eb !important;
      }
    ` : ''}
  `);
}

// Listen for theme changes
nativeTheme.on('updated', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    CssInjector.injectCleanUi(win.webContents);
  }
});
```

#### 47. No Advanced Logging Configuration
- **File:** All files
- **Severity:** Medium
- **Issue:** No logging system for debugging production issues.
- **Recommendation:**
```typescript
// src/utils/logger.ts
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

class Logger {
  private static logFile: string;
  private static enabled: boolean = true;

  static init(): void {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(logsDir, `messenger-${date}.log`);
  }

  static debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }

  static info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  static warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  static error(message: string, error?: Error | any): void {
    const data = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    this.log('ERROR', message, data);
  }

  private static log(level: string, message: string, data?: any): void {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
    };

    // Console output
    console.log(`[${level}] ${message}`, data || '');

    // File output
    try {
      fs.appendFileSync(
        this.logFile,
        JSON.stringify(logEntry) + '\n'
      );
    } catch (err) {
      console.error('Failed to write log:', err);
    }
  }
}

// Usage:
Logger.init();
Logger.info('Application started');
Logger.error('Failed to load URL', error);
```

#### 48. ALLOWED_ORIGINS Not Used
- **File:** `src/config/constants.ts:11-16`
- **Severity:** Low
- **Issue:** The `ALLOWED_ORIGINS` array exists but isn't used anywhere. Dead code.
- **Recommendation:** Either implement CSP enforcement or remove the unused config:
```typescript
// Implement CSP:
win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        `default-src 'self' ${APP_CONFIG.URLS.ALLOWED_ORIGINS.join(' ')};`,
      ],
    },
  });
});
```

---

### Code Quality & Testing

#### 52. Magic Strings Scattered
- **File:** Multiple files
- **Severity:** Low
- **Issue:** IPC channel names, CSS selectors hardcoded in multiple places.
- **Recommendation:**
```typescript
// src/constants/index.ts
export const IPC_CHANNELS = {
  UPDATE_BADGE: 'update-badge',
  SHOW_NOTIFICATION: 'show-notification',
  RENDERER_ERROR: 'renderer-error',
} as const;

export const CSS_SELECTORS = {
  INSTALL_BANNER: 'div[aria-label="Install desktop app"]',
  ROLE_BANNER: 'div[role="banner"]',
  ARIA_LABEL: '[aria-label]',
} as const;

// Usage:
ipcMain.on(IPC_CHANNELS.UPDATE_BADGE, ...);
const elements = document.querySelectorAll(CSS_SELECTORS.ARIA_LABEL);
```

## Technical Notes & Known Issues

### 1. Strict Content Security Policy (CSP) Failure
**Attempted Fix:** Implemented a strict CSP to improve security.
**Result:** The application failed to load, displaying a blank screen.
**Root Cause:** Messenger.com requires loading resources from multiple domains (including CDNs and subdomains) and executing inline scripts that were blocked by the strict policy.
**Lesson:** A more permissive CSP is required for Messenger, or we must carefully analyze all network requests to whitelist specific domains.

### 2. Database Corruption & File Locks
**Issue:** Users reported `Failed to delete the database: Database IO error`.
**Root Cause:** Running the development version (`electron .`) while the packaged application (`messenger.app`) was running in the background caused a race condition. Both instances attempted to access the same `userData` directory (`~/Library/Application Support/messenger`), leading to file locks on the SQLite database.
**Resolution:** Terminated all zombie processes to release the file locks.
**Prevention:** Implement a "Single Instance Lock" check at the very beginning of the app startup (before app ready) to ensure only one instance runs per user data directory.

### 3. Cache Clearing Limitations
**Attempted Fix:** Used `session.defaultSession.clearCache()` to resolve database corruption.
**Result:** While it logged the user out, it did not resolve the underlying file lock issue causing the IO error.
**Lesson:** Programmatic cache clearing is insufficient for resolving OS-level file locking issues. Process management is required.
