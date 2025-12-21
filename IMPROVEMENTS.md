# Messenger Desktop - Comprehensive Improvement Analysis

**Date:** December 20, 2025

This document contains a thorough analysis of improvement opportunities for the messenger-desktop application, organized by priority and category.

---

## Executive Summary

The messenger-desktop application has a solid foundation but requires significant improvements in:

- **Error Handling** (6 major gaps causing silent failures)
- **Performance** (badge detection does full DOM scan on every mutation)
- **Cross-platform Support** (badge detection only works on macOS)
- **Testing** (zero test coverage)
- **User Experience** (no settings, notifications, or state persistence)

---

## Enhancement Opportunities (Lower Priority)

### Platform-Specific Features

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
