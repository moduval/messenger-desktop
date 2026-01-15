import { BadgeFinder } from '../src/services/badge-finder';

describe('BadgeFinder', () => {
  let originalTitle: string;

  beforeEach(() => {
    originalTitle = document.title;
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  describe('page title detection', () => {
    it('should find unread count from page title "Messenger (5)"', () => {
      document.title = 'Messenger (5)';
      const count = BadgeFinder.find(document);
      expect(count).toBe('5');
    });

    it('should find unread count from page title "(5) Messenger"', () => {
      document.title = '(5) Messenger';
      const count = BadgeFinder.find(document);
      expect(count).toBe('5');
    });

    it('should return null for page title without count', () => {
      document.title = 'Messenger';
      const count = BadgeFinder.find(document);
      expect(count).toBeNull();
    });
  });

  describe('aria-label detection', () => {
    it('should find unread count from English aria-label', () => {
      document.title = 'Messenger';
      const el = document.createElement('div');
      el.setAttribute('aria-label', 'Chats · 5 unread');
      document.body.appendChild(el);

      const count = BadgeFinder.find(document);
      expect(count).toBe('5');

      document.body.removeChild(el);
    });

    it('should find unread count from French aria-label with Chats', () => {
      document.title = 'Messenger';
      const el = document.createElement('div');
      el.setAttribute('aria-label', 'Chats · 5 non lus');
      document.body.appendChild(el);

      const count = BadgeFinder.find(document);
      expect(count).toBe('5');

      document.body.removeChild(el);
    });

    it('should find unread count from French aria-label with Discussions', () => {
      document.title = 'Messenger';
      const el = document.createElement('div');
      el.setAttribute('aria-label', 'Discussions · 5 non lus');
      document.body.appendChild(el);

      const count = BadgeFinder.find(document);
      expect(count).toBe('5');

      document.body.removeChild(el);
    });
  });

  describe('edge cases', () => {
    it('should return null if no unread count found', () => {
      document.title = 'Messenger';
      const el = document.createElement('div');
      el.setAttribute('aria-label', 'Chats');
      document.body.appendChild(el);

      const count = BadgeFinder.find(document);
      expect(count).toBeNull();

      document.body.removeChild(el);
    });

    it('should ignore elements without aria-label', () => {
      document.title = 'Messenger';
      const el = document.createElement('div');
      el.textContent = 'Chats · 5 unread';
      document.body.appendChild(el);

      const count = BadgeFinder.find(document);
      expect(count).toBeNull();

      document.body.removeChild(el);
    });
  });
});
