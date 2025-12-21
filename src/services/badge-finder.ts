export class BadgeFinder {
  private static readonly UNREAD_PATTERNS = [
    /Chats · (\d+) unread/, // English
    /Chats · (\d+) non lus/ // French
  ];

  static find(doc: Document): string | null {
    const candidates = doc.querySelectorAll('[aria-label]');

    for (const el of candidates) {
      const ariaLabel = el.getAttribute('aria-label');
      if (!ariaLabel) continue;

      const count = this.extractCount(ariaLabel);
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
