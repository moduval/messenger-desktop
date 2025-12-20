describe('Badge Pattern Matching', () => {
  // The regex used in src/preload.ts
  const UNREAD_PATTERN = /Chats · (\d+) unread/;

  it('should extract unread count from aria-label', () => {
    const text = 'Chats · 5 unread';
    const match = text.match(UNREAD_PATTERN);
    expect(match?.[1]).toBe('5');
  });

  it('should return null for no unread messages', () => {
    const text = 'Chats';
    const match = text.match(UNREAD_PATTERN);
    expect(match).toBeNull();
  });

  it('should handle large numbers', () => {
    const text = 'Chats · 999 unread';
    const match = text.match(UNREAD_PATTERN);
    expect(match?.[1]).toBe('999');
  });
});
