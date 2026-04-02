import { BadgeFinder } from '../src/services/badge-finder';

describe('BadgeFinder', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('primary strategy ([aria-live] / [role="status"])', () => {
    it('counts [aria-live] element with "Unread message" text', () => {
      const el = document.createElement('div');
      el.setAttribute('aria-live', 'polite');
      el.textContent = 'Unread message';
      document.body.appendChild(el);

      expect(BadgeFinder.find(document)).toBe('1');
    });

    it('counts [role="status"] element with "Unread message" text', () => {
      const el = document.createElement('div');
      el.setAttribute('role', 'status');
      el.textContent = 'Unread message';
      document.body.appendChild(el);

      expect(BadgeFinder.find(document)).toBe('1');
    });

    it('counts "Message non lu" (French)', () => {
      const el = document.createElement('div');
      el.setAttribute('aria-live', 'polite');
      el.textContent = 'Message non lu';
      document.body.appendChild(el);

      expect(BadgeFinder.find(document)).toBe('1');
    });

    it('counts multiple matching elements', () => {
      for (let i = 0; i < 3; i++) {
        const el = document.createElement('div');
        el.setAttribute('aria-live', 'polite');
        el.textContent = 'Unread message';
        document.body.appendChild(el);
      }

      expect(BadgeFinder.find(document)).toBe('3');
    });

    it('ignores [aria-live] elements without matching text', () => {
      const el = document.createElement('div');
      el.setAttribute('aria-live', 'polite');
      el.textContent = 'Some other notification';
      document.body.appendChild(el);

      expect(BadgeFinder.find(document)).toBeNull();
    });
  });

  describe('fallback strategy (blue dot indicators)', () => {
    it('counts span[data-visualcompletion="ignore"] with blue background', () => {
      const span = document.createElement('span');
      span.setAttribute('data-visualcompletion', 'ignore');
      span.style.backgroundColor = 'rgb(0, 100, 209)';
      document.body.appendChild(span);

      expect(BadgeFinder.find(document)).toBe('1');
    });

    it('counts multiple blue dot spans', () => {
      for (let i = 0; i < 2; i++) {
        const span = document.createElement('span');
        span.setAttribute('data-visualcompletion', 'ignore');
        span.style.backgroundColor = 'rgb(0, 100, 209)';
        document.body.appendChild(span);
      }

      expect(BadgeFinder.find(document)).toBe('2');
    });

    it('ignores spans with a different background color', () => {
      const span = document.createElement('span');
      span.setAttribute('data-visualcompletion', 'ignore');
      span.style.backgroundColor = 'rgb(255, 0, 0)';
      document.body.appendChild(span);

      expect(BadgeFinder.find(document)).toBeNull();
    });

    it('ignores spans without data-visualcompletion attribute', () => {
      const span = document.createElement('span');
      span.style.backgroundColor = 'rgb(0, 100, 209)';
      document.body.appendChild(span);

      expect(BadgeFinder.find(document)).toBeNull();
    });
  });

  describe('no indicators', () => {
    it('returns null when document is empty', () => {
      expect(BadgeFinder.find(document)).toBeNull();
    });
  });
});
