export class BadgeFinder {
  private static readonly UNREAD_PATTERNS = [
    // Page title patterns
    /Messenger\s*\((\d+)\)/, // "Messenger (5)" or "Messenger(5)"
    /\((\d+)\)\s*Messenger/, // "(5) Messenger"
    // English variations
    /Chats\s*[·•]\s*(\d+)\s*unread/i,
    /(\d+)\s*unread/i,
    // French variations
    /Discussions\s*[·•]\s*(\d+)\s*non\s*lus?/i,
    /Chats\s*[·•]\s*(\d+)\s*non\s*lus?/i,
    /(\d+)\s*non\s*lus?/i,
    /(\d+)\s*message[s]?\s*non\s*lus?/i
  ];

  static find(doc: Document): string | null {
    // First check the page title - Messenger often shows "(5) Messenger" or "Messenger (5)"
    const pageTitle = doc.title;
    if (pageTitle) {
      const titleCount = this.extractCount(pageTitle);
      if (titleCount) {
        return titleCount;
      }
    }

    // Check aria-labels
    const ariaElements = doc.querySelectorAll('[aria-label]');
    for (const el of ariaElements) {
      const ariaLabel = el.getAttribute('aria-label');
      if (!ariaLabel) continue;

      const count = this.extractCount(ariaLabel);
      if (count) {
        return count;
      }
    }

    // Check title attributes (tooltips)
    const titleElements = doc.querySelectorAll('[title]');
    for (const el of titleElements) {
      const title = el.getAttribute('title');
      if (!title) continue;

      const count = this.extractCount(title);
      if (count) {
        return count;
      }
    }

    return null;
  }

  private static extractCount(ariaLabel: string): string | null {
    const match = this.UNREAD_PATTERNS.map((pattern) => ariaLabel.match(pattern)).find(
      (match) => match !== null
    );

    return match ? match[1] : null;
  }
}
