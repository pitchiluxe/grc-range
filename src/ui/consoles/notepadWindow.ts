/**
 * Notepad console window for the GRC Range desktop.
 *
 * A simple notepad for taking audit notes during the lab. It provides a menu
 * bar (File, Edit, Format), a text area, and a status bar with a live word
 * count. Notes persist to `localStorage` so they survive window reopens.
 */

import { getTheme } from '@/ui/themes';
import type { GrcServices } from '@/vm/session';

/** localStorage key for persisted notepad content. */
const STORAGE_KEY = 'grc-range-notepad';

/**
 * Render the Notepad window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle (unused).
 */
export function renderNotepadWindow(body: HTMLElement, _services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';

  // Menu bar
  const menuBar = document.createElement('div');
  menuBar.style.display = 'flex';
  menuBar.style.alignItems = 'center';
  menuBar.style.gap = '2px';
  menuBar.style.padding = '4px 8px';
  menuBar.style.background = theme.bg;
  menuBar.style.borderBottom = `1px solid ${theme.border}`;
  menuBar.style.fontSize = '13px';

  const menus: { label: string; items: { text: string; action: () => void }[] }[] = [
    {
      label: 'File',
      items: [
        { text: 'Save', action: () => save() },
        { text: 'Load', action: () => load() },
        { text: 'Clear', action: () => { textarea.value = ''; updateStatus(); } },
      ],
    },
    {
      label: 'Edit',
      items: [
        { text: 'Select All', action: () => textarea.select() },
        { text: 'Insert Timestamp', action: () => { insertTimestamp(); } },
      ],
    },
    {
      label: 'Format',
      items: [
        { text: 'Word Wrap: On', action: () => { textarea.style.whiteSpace = 'pre-wrap'; } },
        { text: 'Word Wrap: Off', action: () => { textarea.style.whiteSpace = 'pre'; } },
      ],
    },
  ];

  for (const menu of menus) {
    const btn = document.createElement('button');
    btn.textContent = menu.label;
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.color = theme.text;
    btn.style.padding = '4px 10px';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '3px';
    btn.style.fontSize = '13px';

    const dropdown = document.createElement('div');
    dropdown.style.position = 'absolute';
    dropdown.style.background = theme.surface;
    dropdown.style.border = `1px solid ${theme.border}`;
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    dropdown.style.padding = '4px 0';
    dropdown.style.zIndex = '1000';
    dropdown.style.minWidth = '180px';
    dropdown.style.display = 'none';

    for (const item of menu.items) {
      const itemBtn = document.createElement('div');
      itemBtn.textContent = item.text;
      itemBtn.style.padding = '6px 16px';
      itemBtn.style.cursor = 'pointer';
      itemBtn.style.fontSize = '13px';
      itemBtn.addEventListener('mouseenter', () => { itemBtn.style.background = theme.surfaceHover; });
      itemBtn.addEventListener('mouseleave', () => { itemBtn.style.background = 'transparent'; });
      itemBtn.addEventListener('click', () => {
        item.action();
        dropdown.style.display = 'none';
      });
      dropdown.appendChild(itemBtn);
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdown.style.display === 'block';
      closeAllDropdowns();
      if (!open) {
        dropdown.style.display = 'block';
        const rect = btn.getBoundingClientRect();
        const bodyRect = body.getBoundingClientRect();
        dropdown.style.left = `${rect.left - bodyRect.left}px`;
        dropdown.style.top = `${rect.bottom - bodyRect.top}px`;
      }
    });

    body.style.position = 'relative';
    body.appendChild(dropdown);
    menuBar.appendChild(btn);
  }

  function closeAllDropdowns(): void {
    const drops = body.querySelectorAll('div[style*="z-index: 1000"]');
    drops.forEach((d) => { (d as HTMLElement).style.display = 'none'; });
  }
  body.addEventListener('click', () => closeAllDropdowns());

  body.appendChild(menuBar);

  // Text area
  const textarea = document.createElement('textarea');
  textarea.style.flex = '1';
  textarea.style.width = '100%';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.resize = 'none';
  textarea.style.padding = '12px';
  textarea.style.background = theme.surface;
  textarea.style.color = theme.text;
  textarea.style.fontFamily = "'Consolas', 'Courier New', monospace";
  textarea.style.fontSize = '14px';
  textarea.style.lineHeight = '1.5';
  textarea.style.whiteSpace = 'pre-wrap';
  textarea.placeholder = 'Type your audit notes here...';
  body.appendChild(textarea);

  // Status bar
  const status = document.createElement('div');
  status.style.display = 'flex';
  status.style.justifyContent = 'space-between';
  status.style.padding = '4px 12px';
  status.style.background = theme.bg;
  status.style.borderTop = `1px solid ${theme.border}`;
  status.style.fontSize = '12px';
  status.style.color = theme.textDim;

  const wordCount = document.createElement('span');
  const charCount = document.createElement('span');
  status.appendChild(wordCount);
  status.appendChild(charCount);
  body.appendChild(status);

  function updateStatus(): void {
    const text = textarea.value;
    const chars = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const lines = text.split('\n').length;
    wordCount.textContent = `Words: ${words}`;
    charCount.textContent = `Chars: ${chars}  |  Lines: ${lines}`;
  }

  function save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, textarea.value);
      flashStatus('Saved');
    } catch {
      flashStatus('Save failed');
    }
  }

  function load(): void {
    const data = localStorage.getItem(STORAGE_KEY);
    textarea.value = data ?? '';
    updateStatus();
    flashStatus('Loaded');
  }

  function insertTimestamp(): void {
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const insert = `[${ts}] `;
    textarea.value = textarea.value.slice(0, start) + insert + textarea.value.slice(end);
    updateStatus();
  }

  let flashTimer: ReturnType<typeof setTimeout> | undefined;
  function flashStatus(msg: string): void {
    wordCount.textContent = msg;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => updateStatus(), 1500);
  }

  textarea.addEventListener('input', updateStatus);

  // Load saved content on open
  load();
}
