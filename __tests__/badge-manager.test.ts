import { BadgeManager } from '../src/services/badge-manager';

describe('BadgeManager', () => {
  let onUpdateMock: jest.Mock;

  beforeEach(() => {
    document.body.innerHTML = '';
    jest.useFakeTimers();
    onUpdateMock = jest.fn();
  });

  afterEach(() => {
    BadgeManager.destroy();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function addContainer(): HTMLElement {
    const container = document.createElement('ul');
    container.setAttribute('role', 'list');
    document.body.appendChild(container);
    return container;
  }

  function addUnreadElement(parent: HTMLElement, text = 'Unread message'): HTMLElement {
    const el = document.createElement('div');
    el.setAttribute('aria-live', 'polite');
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  it('does not call onUpdate before the container is found', () => {
    BadgeManager.init(onUpdateMock);

    expect(onUpdateMock).not.toHaveBeenCalled();
  });

  it('runs initial check (null) when container is found', () => {
    addContainer();
    BadgeManager.init(onUpdateMock);
    jest.advanceTimersByTime(1000);

    expect(onUpdateMock).toHaveBeenCalledWith(null);
  });

  it('detects existing unread count when container appears', () => {
    const container = addContainer();
    addUnreadElement(container);
    BadgeManager.init(onUpdateMock);
    jest.advanceTimersByTime(1000);

    expect(onUpdateMock).toHaveBeenCalledWith('1');
  });

  it('detects mutations within the container after debounce', async () => {
    const container = addContainer();
    BadgeManager.init(onUpdateMock);
    jest.advanceTimersByTime(1000); // attach observer + initial check
    onUpdateMock.mockClear();

    addUnreadElement(container);
    await Promise.resolve(); // flush MutationObserver microtask → debounce timer set
    jest.advanceTimersByTime(500); // fire debounce

    expect(onUpdateMock).toHaveBeenCalledWith('1');
  });

  it('safety-net poll catches missed mutations', () => {
    const container = addContainer();
    BadgeManager.init(onUpdateMock);
    jest.advanceTimersByTime(1000); // attach + initial null
    onUpdateMock.mockClear();

    addUnreadElement(container);
    jest.advanceTimersByTime(5000); // safety poll fires at 5s

    expect(onUpdateMock).toHaveBeenCalledWith('1');
  });

  it('deduplicates: does not call onUpdate when count is unchanged', () => {
    const container = addContainer();
    addUnreadElement(container);
    BadgeManager.init(onUpdateMock);
    jest.advanceTimersByTime(1000); // attach + initial '1'
    expect(onUpdateMock).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5000); // safety poll: still '1'
    expect(onUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('stops observing and polling after destroy', async () => {
    const container = addContainer();
    BadgeManager.init(onUpdateMock);
    jest.advanceTimersByTime(1000);
    onUpdateMock.mockClear();

    BadgeManager.destroy();

    addUnreadElement(container);
    await Promise.resolve();
    jest.advanceTimersByTime(5000);

    expect(onUpdateMock).not.toHaveBeenCalled();
  });
});
