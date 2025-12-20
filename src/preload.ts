import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('messengerApi', {
  updateBadge: (count: string | null) => {
    ipcRenderer.send('update-badge', count);
  }
});

class BadgeManager {
  private static readonly UNREAD_PATTERN = /Chats · (\d+) unread/;

  static init(): void {
    try {
      this.setupObserver();
    } catch (error) {
      console.error('Failed to initialize badge observer:', error);
    }
  }

  private static setupObserver(): void {
    const observer = new MutationObserver(() => this.handleMutation());

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label'],
      characterData: true
    });
  }

  private static handleMutation(): void {
    try {
      this.checkUnreadCount();
    } catch (error) {
      console.error('Badge detection error:', error);
    }
  }

  private static checkUnreadCount(): void {
    const count = this.findUnreadCount();
    this.updateBadge(count);
  }

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

  private static updateBadge(count: string | null): void {
    ipcRenderer.send('update-badge', count);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  BadgeManager.init();
});
