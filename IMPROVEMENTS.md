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
4. [Detailed Issue Breakdown](#detailed-issue-breakdown)
5. [Technical Notes & Known Issues](#technical-notes--known-issues)

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
  contentSecurityPolicy: "default-src 'self' https://www.messenger.com https://*.fbcdn.net; script-src 'self' https://www.messenger.com";
}
```

---

### Error Handling Gaps

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
    timestamp: Date.now()
  });
});
```

---

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

---

### User Experience Improvements

---

### Configuration & Customization

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
        `default-src 'self' ${APP_CONFIG.URLS.ALLOWED_ORIGINS.join(' ')};`
      ]
    }
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
