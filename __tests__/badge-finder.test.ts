import { BadgeFinder } from '../src/services/badge-finder';

describe('BadgeFinder', () => {
  it('should find unread count from aria-label', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-label', 'Chats · 5 unread');
    document.body.appendChild(el);

    const count = BadgeFinder.find(document);
    expect(count).toBe('5');

    document.body.removeChild(el);
  });

  it('should return null if no unread count found', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-label', 'Chats');
    document.body.appendChild(el);

    const count = BadgeFinder.find(document);
    expect(count).toBeNull();

    document.body.removeChild(el);
  });

  it('should ignore elements without aria-label', () => {
    const el = document.createElement('div');
    el.textContent = 'Chats · 5 unread';
    document.body.appendChild(el);

    const count = BadgeFinder.find(document);
    expect(count).toBeNull();

    document.body.removeChild(el);
  });
});
