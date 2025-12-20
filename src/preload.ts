import { ipcRenderer } from 'electron';

window.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver(() => {
    // Search for the specific text pattern in the document
    // We look for any element that contains "Chats · X unread"
    // This is a bit expensive but robust against class name changes
    const allElements = document.querySelectorAll('*');
    let found = false;

    for (const el of allElements) {
      // Check aria-label or text content
      const text = el.getAttribute('aria-label') || el.textContent;
      if (text) {
        const match = text.match(/Chats · (\d+) unread/);
        if (match) {
          const count = match[1];
          ipcRenderer.send('update-badge', count);
          found = true;
          break; // Stop after finding the first match (usually the sidebar header)
        }
      }
    }

    if (!found) {
      // If we can't find the "unread" text, maybe check for just "Chats" which implies 0 unread?
      // Or just don't clear it immediately to avoid flickering.
      // But if the user read the messages, the text changes to just "Chats".
      // So if we don't find the pattern, we can assume 0.
      ipcRenderer.send('update-badge', null);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-label'], // Watch for aria-label changes too
    characterData: true
  });
});
