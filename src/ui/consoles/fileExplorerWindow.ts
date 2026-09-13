/**
 * File Explorer console window for the GRC Range desktop.
 *
 * A Windows File Explorer showing the C:\GRC_Lab_Data\ directory tree. It has
 * a left sidebar tree navigation, a main file/folder listing with icons, a
 * path bar, a preview pane for text files, and a right-click context menu.
 * Finance_Share and HR_Records are highlighted with a warning indicator
 * because they hold non-compliant data.
 */

import { getTheme } from '@/ui/themes';
import type { AclEntry } from '@/domain/types';
import type { GrcServices } from '@/vm/session';
import type { DirListing } from '@/services/mockFileSystem';

/** Directories flagged as non-compliant (sensitive data at rest). */
const WARNING_DIRS = new Set(['Finance_Share', 'HR_Records']);

/**
 * Render the File Explorer window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle (filesystem access).
 */
export function renderFileExplorerWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';

  // Path bar
  const pathBar = document.createElement('div');
  pathBar.style.display = 'flex';
  pathBar.style.alignItems = 'center';
  pathBar.style.gap = '6px';
  pathBar.style.padding = '6px 12px';
  pathBar.style.background = theme.bg;
  pathBar.style.borderBottom = `1px solid ${theme.border}`;

  const backBtn = document.createElement('button');
  backBtn.textContent = '\u2191';
  backBtn.style.fontSize = '14px';
  backBtn.style.padding = '4px 10px';
  backBtn.style.background = theme.surfaceHover;
  backBtn.style.color = theme.text;
  backBtn.style.border = `1px solid ${theme.border}`;
  backBtn.style.borderRadius = '4px';
  backBtn.style.cursor = 'pointer';

  const pathInput = document.createElement('input');
  pathInput.type = 'text';
  pathInput.readOnly = true;
  pathInput.style.flex = '1';
  pathInput.style.padding = '5px 10px';
  pathInput.style.background = theme.surface;
  pathInput.style.color = theme.text;
  pathInput.style.border = `1px solid ${theme.border}`;
  pathInput.style.borderRadius = '4px';
  pathInput.style.fontSize = '13px';

  pathBar.appendChild(backBtn);
  pathBar.appendChild(pathInput);
  body.appendChild(pathBar);

  // Main split: sidebar tree + main listing + preview
  const main = document.createElement('div');
  main.style.flex = '1';
  main.style.display = 'flex';
  main.style.overflow = 'hidden';

  // Sidebar tree
  const sidebar = document.createElement('div');
  sidebar.style.width = '200px';
  sidebar.style.flexShrink = '0';
  sidebar.style.background = theme.bg;
  sidebar.style.borderRight = `1px solid ${theme.border}`;
  sidebar.style.padding = '8px 0';
  sidebar.style.overflow = 'auto';

  const treeNodes: { path: string; label: string; depth: number }[] = [
    { path: 'C:\\', label: 'C:\\', depth: 0 },
    { path: 'C:\\GRC_Lab_Data', label: 'GRC_Lab_Data', depth: 1 },
    { path: 'C:\\GRC_Lab_Data\\Finance_Share', label: 'Finance_Share', depth: 2 },
    { path: 'C:\\GRC_Lab_Data\\HR_Records', label: 'HR_Records', depth: 2 },
    { path: 'C:\\GRC_Lab_Data\\Tools', label: 'Tools', depth: 2 },
    { path: 'C:\\GRC_Lab_Data\\Logs', label: 'Logs', depth: 2 },
    { path: 'C:\\GRC_Lab_Data\\Policies', label: 'Policies', depth: 2 },
    { path: 'C:\\GRC_Lab_Data\\SIEM_Samples', label: 'SIEM_Samples', depth: 2 },
  ];

  for (const node of treeNodes) {
    const btn = document.createElement('button');
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '6px';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    btn.style.padding = `5px 12px 5px ${12 + node.depth * 16}px`;
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.color = theme.text;
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '13px';

    const icon = document.createElement('span');
    icon.textContent = '\u{1F4C1}';
    icon.style.fontSize = '14px';
    btn.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = node.label;
    if (WARNING_DIRS.has(node.label)) {
      label.style.color = theme.warning;
    }
    btn.appendChild(label);

    if (WARNING_DIRS.has(node.label)) {
      const warn = document.createElement('span');
      warn.textContent = '\u26A0';
      warn.style.color = theme.warning;
      warn.style.marginLeft = '4px';
      btn.appendChild(warn);
    }

    btn.addEventListener('mouseenter', () => { btn.style.background = theme.surfaceHover; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
    btn.addEventListener('click', () => navigate(node.path));
    sidebar.appendChild(btn);
  }

  // Main listing area
  const listing = document.createElement('div');
  listing.style.flex = '1';
  listing.style.overflow = 'auto';
  listing.style.padding = '0';

  // Preview pane
  const preview = document.createElement('div');
  preview.style.width = '280px';
  preview.style.flexShrink = '0';
  preview.style.background = theme.bg;
  preview.style.borderLeft = `1px solid ${theme.border}`;
  preview.style.padding = '16px';
  preview.style.overflow = 'auto';
  preview.style.fontSize = '13px';

  const previewTitle = document.createElement('div');
  previewTitle.style.fontWeight = '600';
  previewTitle.style.marginBottom = '8px';
  previewTitle.style.color = theme.textDim;
  previewTitle.textContent = 'Preview';
  preview.appendChild(previewTitle);

  const previewContent = document.createElement('pre');
  previewContent.style.whiteSpace = 'pre-wrap';
  previewContent.style.wordBreak = 'break-all';
  previewContent.style.fontFamily = "'Consolas', monospace";
  previewContent.style.fontSize = '12px';
  previewContent.style.color = theme.text;
  previewContent.textContent = 'Select a text file to preview.';
  preview.appendChild(previewContent);

  let currentPath = 'C:\\GRC_Lab_Data';

  function navigate(path: string): void {
    currentPath = path;
    pathInput.value = path;
    renderListing();
  }

  function renderListing(): void {
    listing.innerHTML = '';

    // Column headers
    const header = document.createElement('div');
    header.style.display = 'grid';
    header.style.gridTemplateColumns = '30px 1fr 100px 160px';
    header.style.padding = '6px 12px';
    header.style.background = theme.bg;
    header.style.borderBottom = `1px solid ${theme.border}`;
    header.style.fontSize = '12px';
    header.style.color = theme.textDim;
    header.style.fontWeight = '600';
    header.style.position = 'sticky';
    header.style.top = '0';

    for (const col of ['', 'Name', 'Size', 'Date modified']) {
      const c = document.createElement('div');
      c.textContent = col;
      header.appendChild(c);
    }
    listing.appendChild(header);

    const items = services.fs.listDir(currentPath);
    if (!items) {
      const empty = document.createElement('div');
      empty.textContent = 'This folder is empty.';
      empty.style.padding = '20px';
      empty.style.color = theme.textDim;
      listing.appendChild(empty);
      return;
    }

    for (const item of items) {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '30px 1fr 100px 160px';
      row.style.padding = '6px 12px';
      row.style.cursor = 'pointer';
      row.style.borderBottom = `1px solid ${theme.border}`;
      row.style.fontSize = '13px';
      row.style.alignItems = 'center';

      const isDir = item.type === 'directory';
      const isWarning = isDir && WARNING_DIRS.has(item.name);

      // Icon
      const iconCell = document.createElement('div');
      iconCell.textContent = isDir ? '\u{1F4C1}' : getFileIcon(item.name);
      iconCell.style.fontSize = '16px';
      row.appendChild(iconCell);

      // Name
      const nameCell = document.createElement('div');
      nameCell.textContent = item.name;
      if (isWarning) {
        nameCell.style.color = theme.warning;
        nameCell.style.fontWeight = '600';
      }
      row.appendChild(nameCell);

      // Warning indicator
      if (isWarning) {
        const warn = document.createElement('span');
        warn.textContent = ' \u26A0';
        warn.style.color = theme.warning;
        nameCell.appendChild(warn);
      }

      // Size
      const sizeCell = document.createElement('div');
      sizeCell.textContent = isDir ? '' : formatSize(item.size);
      sizeCell.style.color = theme.textDim;
      row.appendChild(sizeCell);

      // Date
      const dateCell = document.createElement('div');
      dateCell.textContent = '2024-09-13 08:00';
      dateCell.style.color = theme.textDim;
      row.appendChild(dateCell);

      row.addEventListener('mouseenter', () => { row.style.background = theme.surfaceHover; });
      row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

      if (isDir) {
        row.addEventListener('dblclick', () => {
          const newPath = currentPath === 'C:\\' ? `C:\\${item.name}` : `${currentPath}\\${item.name}`;
          navigate(newPath);
        });
      } else {
        row.addEventListener('click', () => previewFile(currentPath, item.name));
        row.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showContextMenu(e, currentPath, item);
        });
      }

      listing.appendChild(row);
    }
  }

  function previewFile(dir: string, name: string): void {
    const fullPath = dir === 'C:\\' ? `C:\\${name}` : `${dir}\\${name}`;
    const content = services.fs.readFile(fullPath);
    previewTitle.textContent = name;
    if (content !== undefined) {
      previewContent.textContent = content;
    } else {
      previewContent.textContent = 'Unable to read file.';
    }
  }

  function showContextMenu(
    e: MouseEvent,
    dir: string,
    item: DirListing,
  ): void {
    // Remove any existing context menu
    const existing = body.querySelector('.grc-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.className = 'grc-context-menu';
    menu.style.position = 'fixed';
    menu.style.background = theme.surface;
    menu.style.border = `1px solid ${theme.border}`;
    menu.style.borderRadius = '6px';
    menu.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)';
    menu.style.padding = '4px 0';
    menu.style.zIndex = '10000';
    menu.style.minWidth = '160px';
    menu.style.fontSize = '13px';

    const fullPath = dir === 'C:\\' ? `C:\\${item.name}` : `${dir}\\${item.name}`;

    const propsItem = document.createElement('div');
    propsItem.textContent = 'Properties';
    propsItem.style.padding = '6px 16px';
    propsItem.style.cursor = 'pointer';
    propsItem.addEventListener('mouseenter', () => { propsItem.style.background = theme.surfaceHover; });
    propsItem.addEventListener('mouseleave', () => { propsItem.style.background = 'transparent'; });
    propsItem.addEventListener('click', () => {
      menu.remove();
      showProperties(fullPath, item);
    });
    menu.appendChild(propsItem);

    const aclItem = document.createElement('div');
    aclItem.textContent = 'View ACLs';
    aclItem.style.padding = '6px 16px';
    aclItem.style.cursor = 'pointer';
    aclItem.addEventListener('mouseenter', () => { aclItem.style.background = theme.surfaceHover; });
    aclItem.addEventListener('mouseleave', () => { aclItem.style.background = 'transparent'; });
    aclItem.addEventListener('click', () => {
      menu.remove();
      showAcls(fullPath);
    });
    menu.appendChild(aclItem);

    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    body.appendChild(menu);

    const close = () => { menu.remove(); document.removeEventListener('click', close); };
    setTimeout(() => document.addEventListener('click', close), 0);
  }

  function showProperties(path: string, item: DirListing): void {
    const overlay = makeOverlay(theme);
    const card = makeCard(theme, 'Properties');
    const rows: [string, string][] = [
      ['Name', item.name],
      ['Type', item.type === 'directory' ? 'File folder' : 'File'],
      ['Path', path],
      ['Size', item.type === 'file' ? formatSize(item.size) : ''],
      ['Modified', '2024-09-13 08:00'],
    ];
    for (const [label, value] of rows) {
      const r = document.createElement('div');
      r.style.display = 'flex';
      r.style.justifyContent = 'space-between';
      r.style.padding = '6px 0';
      r.style.borderBottom = `1px solid ${theme.border}`;
      r.style.fontSize = '13px';
      const l = document.createElement('span');
      l.textContent = label;
      l.style.color = theme.textDim;
      const v = document.createElement('span');
      v.textContent = value;
      v.style.color = theme.text;
      r.appendChild(l);
      r.appendChild(v);
      card.appendChild(r);
    }
    const closeBtn = makeCloseBtn(theme, () => overlay.remove());
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    body.appendChild(overlay);
  }

  function showAcls(path: string): void {
    const overlay = makeOverlay(theme);
    const card = makeCard(theme, `ACLs - ${path}`);
    const acl = services.fs.getAcl(path);
    if (!acl || acl.length === 0) {
      const msg = document.createElement('div');
      msg.textContent = 'No ACL information available.';
      msg.style.color = theme.textDim;
      card.appendChild(msg);
    } else {
      for (const entry of acl) {
        const r = document.createElement('div');
        r.style.padding = '6px 0';
        r.style.borderBottom = `1px solid ${theme.border}`;
        r.style.fontSize = '13px';
        const isEveryone = entry.identity === 'Everyone';
        r.innerHTML = `<span style="color:${isEveryone ? theme.danger : theme.text};font-weight:${isEveryone ? '600' : '400'}">${entry.identity}</span>
          <span style="color:${theme.textDim}"> ${entry.rights} ${entry.inheritance}</span>`;
        card.appendChild(r);
      }
    }
    const closeBtn = makeCloseBtn(theme, () => overlay.remove());
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    body.appendChild(overlay);
  }

  backBtn.addEventListener('click', () => {
    if (currentPath === 'C:\\') return;
    const idx = currentPath.lastIndexOf('\\');
    if (idx <= 2) {
      navigate('C:\\');
    } else {
      navigate(currentPath.slice(0, idx));
    }
  });

  main.appendChild(sidebar);
  main.appendChild(listing);
  main.appendChild(preview);
  body.appendChild(main);

  navigate('C:\\GRC_Lab_Data');
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Return an icon glyph based on file extension. */
function getFileIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.ps1')) return '\u{1F4E6}';
  if (lower.endsWith('.csv')) return '\u{1F4CA}';
  if (lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.log')) return '\u{1F4DD}';
  return '\u{1F4C4}';
}

/** Format a byte count as a human-readable size. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Create a full-screen modal overlay. */
function makeOverlay(theme: { bg: string; border: string }): HTMLElement {
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.5)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '5000';
  return overlay;
}

/** Create a card container for a modal. */
function makeCard(theme: { surface: string; border: string; text: string }, title: string): HTMLElement {
  const card = document.createElement('div');
  card.style.background = theme.surface;
  card.style.border = `1px solid ${theme.border}`;
  card.style.borderRadius = '8px';
  card.style.padding = '20px 24px';
  card.style.minWidth = '400px';
  card.style.maxWidth = '500px';
  card.style.maxHeight = '70%';
  card.style.overflow = 'auto';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.gap = '4px';
  const h = document.createElement('h3');
  h.textContent = title;
  h.style.margin = '0 0 12px 0';
  h.style.color = theme.text;
  h.style.fontSize = '15px';
  card.appendChild(h);
  return card;
}

/** Create a close button for a modal. */
function makeCloseBtn(theme: { accent: string; surfaceHover: string; border: string; text: string }, onClose: () => void): HTMLElement {
  const btn = document.createElement('button');
  btn.textContent = 'Close';
  btn.style.marginTop = '16px';
  btn.style.padding = '6px 20px';
  btn.style.background = theme.accent;
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '4px';
  btn.style.cursor = 'pointer';
  btn.style.alignSelf = 'flex-end';
  btn.addEventListener('click', onClose);
  return btn;
}
