import { BadgeFinder } from './badge-finder';

export type BadgeUpdateCallback = (count: string | null) => void;

export class BadgeManager {
  private static onUpdate: BadgeUpdateCallback | null = null;
  private static observer: MutationObserver | null = null;
  private static debounceTimer: number | null = null;
  private static lastBadgeCount: string | null | undefined = undefined;
  private static pollInterval: number | null = null;
  private static attachInterval: number | null = null;
  private static readonly DEBOUNCE_DELAY = 500;

  static init(onUpdate: BadgeUpdateCallback): void {
    this.destroy();
    this.onUpdate = onUpdate;
    this.startLazyAttach();
    // Safety net: poll every 5s to catch missed mutations
    this.pollInterval = window.setInterval(() => this.checkUnreadCount(), 5000);
  }

  static destroy(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.attachInterval !== null) {
      clearInterval(this.attachInterval);
      this.attachInterval = null;
    }
    this.onUpdate = null;
    this.lastBadgeCount = undefined;
  }

  private static startLazyAttach(): void {
    // Poll every 1s until the conversation list container is available
    this.attachInterval = window.setInterval(() => {
      const container = document.querySelector('[role="list"], [role="grid"]');
      if (container) {
        clearInterval(this.attachInterval!);
        this.attachInterval = null;
        this.setupObserver(container);
        this.checkUnreadCount();
      }
    }, 1000);
  }

  private static setupObserver(container: Element): void {
    this.observer = new MutationObserver(() => this.handleMutation());
    this.observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  private static handleMutation(): void {
    try {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = window.setTimeout(() => {
        this.checkUnreadCount();
        this.debounceTimer = null;
      }, this.DEBOUNCE_DELAY);
    } catch (error) {
      console.error('Badge detection error:', error);
    }
  }

  private static checkUnreadCount(): void {
    const count = BadgeFinder.find(document);
    this.updateBadge(count);
  }

  private static updateBadge(count: string | null): void {
    if (count === this.lastBadgeCount) {
      return;
    }
    this.lastBadgeCount = count;
    if (this.onUpdate) {
      this.onUpdate(count);
    }
  }
}
