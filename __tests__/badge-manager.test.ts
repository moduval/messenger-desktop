import { waitFor } from '@testing-library/dom';
import { BadgeManager } from '../src/services/badge-manager';

describe('BadgeManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    BadgeManager.destroy();
    jest.clearAllMocks();
  });

  it('should start observing mutations upon initialization', async () => {
    const { onUpdateMock } = initializeBadgeManager();

    givenNotification(1);

    await waitFor(() => {
      expect(onUpdateMock).toHaveBeenCalledWith('1');
    });
  });

  it('should detect existing badge count immediately upon initialization', () => {
    givenNotification(5);
    const { onUpdateMock } = initializeBadgeManager();

    expect(onUpdateMock).toHaveBeenCalledWith('5');
  });

  it('should update count when existing badge count changes', async () => {
    const { onUpdateMock } = initializeBadgeManager();

    const element = givenNotification(2);
    element.setAttribute('aria-label', 'Chats · 3 unread');

    await waitFor(() => {
      expect(onUpdateMock).toHaveBeenLastCalledWith('3');
    });
  });

  it('should update to null when badge is removed', async () => {
    const { onUpdateMock } = initializeBadgeManager();

    const element = givenNotification(2);

    element.remove();

    await waitFor(() => {
      expect(onUpdateMock).toHaveBeenLastCalledWith(null);
    });
  });

  it('should update to null when badge text no longer matches pattern', async () => {
    const { onUpdateMock } = initializeBadgeManager();

    const element = givenNotification(2);

    element.setAttribute('aria-label', 'Chats');

    await waitFor(() => {
      expect(onUpdateMock).toHaveBeenLastCalledWith(null);
    });
  });

  it('should ignore elements that do not match the unread pattern', async () => {
    const { onUpdateMock } = initializeBadgeManager();

    givenNoNotification();

    await waitFor(() => {
      expect(onUpdateMock).toHaveBeenCalledWith(null);
    });
  });

  function givenNotification(count: number) {
    const element = document.createElement('div');
    element.setAttribute('aria-label', `Chats · ${count} unread`);
    document.body.appendChild(element);
    return element;
  }

  function givenNoNotification() {
    const el = document.createElement('div');
    el.setAttribute('aria-label', 'Chats');
    document.body.appendChild(el);
  }

  function initializeBadgeManager() {
    const onUpdateMock = jest.fn();

    BadgeManager.init(onUpdateMock);

    return { onUpdateMock };
  }
});
