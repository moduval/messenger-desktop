import { BadgeFinder } from './badge-finder';

export type BadgeUpdateCallback = (count: string | null) => void;

export class BadgeManager {
  private static onUpdate: BadgeUpdateCallback | null = null;
  private static observer: MutationObserver | null = null;

  static init(onUpdate: BadgeUpdateCallback): void {
    this.destroy();
    this.onUpdate = onUpdate;
    try {
      this.setupObserver();
      this.checkUnreadCount();
    } catch (error) {
      console.error('Failed to initialize badge observer:', error);
    }
  }

  static destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.onUpdate = null;
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
      this.checkUnreadCount();
    } catch (error) {
      console.error('Badge detection error:', error);
    }
  }

  private static checkUnreadCount(): void {
    const count = BadgeFinder.find(document);
    this.updateBadge(count);
  }

  private static updateBadge(count: string | null): void {
    if (this.onUpdate) {
      this.onUpdate(count);
    }
  }
}
