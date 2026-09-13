/**
 * Recycle Bin console window for the GRC Range desktop.
 *
 * Renders a mostly-empty Windows-style Recycle Bin. The lab does not seed any
 * deleted items, so the window shows the standard "Recycle Bin is empty"
 * message along with the toolbar and status bar a real Recycle Bin would have.
 */

import { getTheme } from '@/ui/themes';
import type { GrcServices } from '@/vm/session';

/**
 * Render the Recycle Bin window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle (unused — the bin is always empty).
 */
export function renderRecycleBinWindow(body: HTMLElement, _services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.style.display = 'flex';
  toolbar.style.alignItems = 'center';
  toolbar.style.gap = '8px';
  toolbar.style.padding = '6px 12px';
  toolbar.style.borderBottom = `1px solid ${theme.border}`;
  toolbar.style.background = theme.bg;

  const title = document.createElement('span');
  title.textContent = 'Recycle Bin';
  title.style.fontWeight = '600';
  toolbar.appendChild(title);

  const emptyBtn = document.createElement('button');
  emptyBtn.textContent = 'Empty Recycle Bin';
  emptyBtn.style.padding = '4px 12px';
  emptyBtn.style.background = theme.surfaceHover;
  emptyBtn.style.color = theme.textDim;
  emptyBtn.style.border = `1px solid ${theme.border}`;
  emptyBtn.style.borderRadius = '4px';
  emptyBtn.style.cursor = 'not-allowed';
  emptyBtn.disabled = true;
  toolbar.appendChild(emptyBtn);

  body.appendChild(toolbar);

  // Content area
  const content = document.createElement('div');
  content.style.flex = '1';
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.alignItems = 'center';
  content.style.justifyContent = 'center';
  content.style.color = theme.textDim;
  content.style.fontSize = '14px';
  content.style.gap = '16px';

  const icon = document.createElement('div');
  icon.textContent = '\u{1F5D1}';
  icon.style.fontSize = '64px';
  icon.style.opacity = '0.5';
  content.appendChild(icon);

  const msg = document.createElement('div');
  msg.textContent = 'Recycle Bin is empty';
  content.appendChild(msg);

  body.appendChild(content);

  // Status bar
  const status = document.createElement('div');
  status.style.padding = '4px 12px';
  status.style.borderTop = `1px solid ${theme.border}`;
  status.style.fontSize = '12px';
  status.style.color = theme.textDim;
  status.style.background = theme.bg;
  status.textContent = '0 items';
  body.appendChild(status);
}
