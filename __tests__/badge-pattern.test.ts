describe('Badge Pattern Matching', () => {
  // Page title patterns used in BadgeFinder
  const PAGE_TITLE_PATTERN = /Messenger\s*\((\d+)\)/;
  const PAGE_TITLE_ALT_PATTERN = /\((\d+)\)\s*Messenger/;

  it('should extract unread count from page title "Messenger (5)"', () => {
    const text = 'Messenger (5)';
    const match = text.match(PAGE_TITLE_PATTERN);
    expect(match?.[1]).toBe('5');
  });

  it('should extract unread count from page title "(5) Messenger"', () => {
    const text = '(5) Messenger';
    const match = text.match(PAGE_TITLE_ALT_PATTERN);
    expect(match?.[1]).toBe('5');
  });

  it('should return null for no unread messages', () => {
    const text = 'Messenger';
    const match = text.match(PAGE_TITLE_PATTERN);
    expect(match).toBeNull();
  });

  it('should handle large numbers', () => {
    const text = 'Messenger (999)';
    const match = text.match(PAGE_TITLE_PATTERN);
    expect(match?.[1]).toBe('999');
  });
});
