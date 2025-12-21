export class BadgeFinder {
  private static readonly UNREAD_PATTERN = /Chats · (\d+) unread/;

  static find(doc: Document): string | null {
    const candidates = doc.querySelectorAll('[aria-label]');

    for (const el of candidates) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) {
        const match = ariaLabel.match(this.UNREAD_PATTERN);
        if (match) {
          return match[1];
        }
      }
    }

    return null;
  }
}
