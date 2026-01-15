import { BadgeFinder } from './badge-finder';

export type BadgeUpdateCallback = (count: string | null) => void;

export class BadgeManager {
  private static onUpdate: BadgeUpdateCallback | null = null;
  private static observer: MutationObserver | null = null;
  private static debounceTimer: number | null = null;
  private static initRetryTimer: number | null = null;
  private static lastBadgeCount: string | null | undefined = undefined;
  private static readonly DEBOUNCE_DELAY = 500;
  private static readonly INIT_RETRY_DELAY = 1000;
  private static readonly MAX_INIT_RETRIES = 10;

  static init(onUpdate: BadgeUpdateCallback): void {
    this.destroy();
    this.onUpdate = onUpdate;
    try {
      this.setupObserver();
      this.startInitialCheck();
    } catch (error) {
      console.error('Failed to initialize badge observer:', error);
    }
  }

  private static startInitialCheck(retryCount = 0): void {
    const count = BadgeFinder.find(document);

    if (count !== null) {
      this.updateBadge(count);
      return;
    }

    // No badge found yet - retry if we haven't exceeded max retries
    if (retryCount < this.MAX_INIT_RETRIES) {
      this.initRetryTimer = window.setTimeout(() => {
        this.startInitialCheck(retryCount + 1);
      }, this.INIT_RETRY_DELAY);
    } else {
      // Max retries reached, set badge to null (no unread)
      this.updateBadge(null);
    }
  }

  static destroy(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.initRetryTimer !== null) {
      clearTimeout(this.initRetryTimer);
      this.initRetryTimer = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.onUpdate = null;
    this.lastBadgeCount = undefined;
  }

  private static setupObserver(): void {
    this.observer = new MutationObserver(() => this.handleMutation());

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label'],
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
