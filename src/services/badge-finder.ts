export class BadgeFinder {
  static find(doc: Document): string | null {
    // Primary: count aria-live / role="status" elements whose text signals an unread message
    const liveElements = doc.querySelectorAll('[aria-live], [role="status"]');
    let count = 0;
    for (const el of liveElements) {
      if (/Unread message|Message non lu/i.test(el.textContent ?? '')) {
        count++;
      }
    }

    if (count > 0) {
      return String(count);
    }

    // Fallback: blue dot indicators (Facebook unread dots use rgb(0, 100, 209))
    const dots = doc.querySelectorAll('span[data-visualcompletion="ignore"]');
    let dotCount = 0;
    for (const el of dots) {
      const bg = getComputedStyle(el as HTMLElement).backgroundColor;
      if (bg === 'rgb(0, 100, 209)') {
        dotCount++;
      }
    }

    return dotCount > 0 ? String(dotCount) : null;
  }
}
