/**
 * Windows Server 2022 desktop overlay with a full window manager.
 *
 * This module renders the simulated Windows desktop that sits on top of the
 * login screen after a successful sign-in. It is modeled on the IAM Range's
 * `desktopOverlay.ts` but simplified for the GRC Range's needs.
 *
 * Features:
 *  - Full-screen dark desktop with a gradient wallpaper.
 *  - Desktop icons (grid of app icons on the left side).
 *  - Taskbar at the bottom with a Start button, running-app buttons, and a
 *    system tray with a live clock.
 *  - Start menu popup (grid of all apps).
 *  - Window manager: draggable, minimizable, maximizable, closable windows.
 *  - Z-index management (clicking a window brings it to front).
 *  - Taskbar buttons for open windows; clicking toggles minimize/restore.
 *
 * The desktop does **not** define the apps itself — it receives an array of
 * {@link WindowDef} objects from the caller (main.ts). Each app has a
 * `render` function that populates the window body with its content.
 */

import type { GrcServices } from '@/vm/session';
import { clickSound } from './sounds';

/* -------------------------------------------------------------------------- */
/* Public types                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Definition of a desktop application / window.
 *
 * The caller (main.ts) builds an array of these and passes it to
 * {@link createDesktopOverlay}. The desktop overlay uses the `id` to
 * deduplicate open windows, the `title`/`icon` for the title bar and
 * taskbar button, and `render` to populate the window body.
 */
export interface WindowDef {
  /** Unique identifier for this app (used to prevent duplicate windows). */
  id: string;
  /** Title shown in the window title bar and taskbar. */
  title: string;
  /** Emoji or short text used as the app icon. */
  icon: string;
  /** Default window width in pixels. */
  width: number;
  /** Default window height in pixels. */
  height: number;
  /** Populate the window body element with the app's content. */
  render(services: GrcServices, body: HTMLElement): void;
  /** Optional callback invoked when the app is launched (before render). */
  launch?: () => void;
}

/** Public API for the desktop overlay. */
export interface DesktopOverlay {
  /** Mount the desktop into the DOM. */
  show(services: GrcServices, department?: string, username?: string): void;
  /** Remove the desktop from the DOM. */
  hide(): void;
  /** Whether the desktop is currently visible. */
  isVisible(): boolean;
  /** Open (or focus) a window by app id. */
  openWindow(id: string, services: GrcServices): void;
  /** Callback invoked when the user signs out / exits the desktop. */
  onExit: (() => void) | null;
}

/* -------------------------------------------------------------------------- */
/* Internal state                                                              */
/* -------------------------------------------------------------------------- */

/** The id used for the injected style element. */
const STYLE_ID = 'grc-desktop-style';

/** The id used for the root container element. */
const ROOT_ID = 'grc-desktop-root';

/** A managed open window instance. */
interface ManagedWindow {
  /** The WindowDef this window was created from. */
  def: WindowDef;
  /** The outer window element (includes title bar + body). */
  element: HTMLDivElement;
  /** The body element where `render` placed its content. */
  body: HTMLDivElement;
  /** The taskbar button element for this window. */
  taskbarBtn: HTMLButtonElement;
  /** Whether the window is currently minimized. */
  minimized: boolean;
  /** Whether the window is currently maximized. */
  maximized: boolean;
  /** Saved geometry for restore-from-maximize. */
  savedRect: { left: number; top: number; width: number; height: number };
  /** Cleanup function for drag listeners (called on close). */
  cleanup: (() => void) | null;
}

/* -------------------------------------------------------------------------- */
/* Factory                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Create a desktop overlay instance.
 *
 * @param apps - The array of {@link WindowDef} objects the desktop can launch.
 * @returns A {@link DesktopOverlay} handle.
 */
export function createDesktopOverlay(apps: WindowDef[]): DesktopOverlay {
  let root: HTMLDivElement | null = null;
  let clockTimer: ReturnType<typeof setInterval> | null = null;
  let visible = false;
  let zCounter = 100;
  let startMenuOpen = false;

  /** Open windows keyed by app id. */
  const openWindows = new Map<string, ManagedWindow>();

  /** Lookup map for apps by id. */
  const appMap = new Map<string, WindowDef>();
  for (const app of apps) {
    appMap.set(app.id, app);
  }

  /* ---------------------------------------------------------------------- */
  /* DOM construction                                                       */
  /* ---------------------------------------------------------------------- */

  /** Inject the desktop CSS (idempotent). */
  function injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = DESKTOP_CSS;
    document.head.appendChild(style);
  }

  /** Build the full desktop DOM tree. */
  function buildDesktop(services: GrcServices, department: string, username: string): HTMLDivElement {
    injectStyles();

    const desktop = document.createElement('div');
    desktop.id = ROOT_ID;
    desktop.className = 'grc-desktop';

    // ---- Desktop icons (left-side grid) ----------------------------------
    const iconGrid = document.createElement('div');
    iconGrid.className = 'grc-desktop-icons';

    for (const app of apps) {
      const icon = document.createElement('div');
      icon.className = 'grc-desktop-icon';
      icon.title = app.title;
      icon.innerHTML = `<div class="grc-desktop-icon-img">${app.icon}</div><div class="grc-desktop-icon-label">${app.title}</div>`;
      icon.addEventListener('dblclick', () => {
        clickSound();
        openWindow(app.id, services);
      });
      icon.addEventListener('click', () => {
        // Single click selects (highlight).
        for (const el of iconGrid.querySelectorAll('.grc-desktop-icon.selected')) {
          el.classList.remove('selected');
        }
        icon.classList.add('selected');
      });
      iconGrid.appendChild(icon);
    }

    desktop.appendChild(iconGrid);

    // ---- Window layer (where windows live) ------------------------------
    const windowLayer = document.createElement('div');
    windowLayer.className = 'grc-window-layer';
    desktop.appendChild(windowLayer);

    // ---- Taskbar ---------------------------------------------------------
    const taskbar = document.createElement('div');
    taskbar.className = 'grc-taskbar';

    // Start button.
    const startBtn = document.createElement('button');
    startBtn.className = 'grc-start-btn';
    startBtn.title = 'Start';
    startBtn.innerHTML = '<span class="grc-start-icon">\u{1F4E6}</span>';
    taskbar.appendChild(startBtn);

    // Start menu popup.
    const startMenu = document.createElement('div');
    startMenu.className = 'grc-start-menu';
    startMenu.style.display = 'none';

    const startMenuHeader = document.createElement('div');
    startMenuHeader.className = 'grc-start-menu-header';
    startMenuHeader.textContent = username || 'User';
    startMenu.appendChild(startMenuHeader);

    // Search box at the top of the start menu.
    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.className = 'grc-start-menu-search';
    searchBox.placeholder = 'Search apps...';
    searchBox.setAttribute('autocomplete', 'off');

    const searchWrap = document.createElement('div');
    searchWrap.className = 'grc-start-menu-search-wrap';
    searchWrap.appendChild(searchBox);
    startMenu.appendChild(searchWrap);

    // Section header for the app grid.
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'grc-start-menu-section-header';
    sectionHeader.textContent = 'All Apps';
    startMenu.appendChild(sectionHeader);

    const startMenuGrid = document.createElement('div');
    startMenuGrid.className = 'grc-start-menu-grid';
    for (const app of apps) {
      const item = document.createElement('div');
      item.className = 'grc-start-menu-item';
      item.innerHTML = `<div class="grc-start-menu-item-icon">${app.icon}</div><div class="grc-start-menu-item-label">${app.title}</div>`;
      item.addEventListener('click', () => {
        clickSound();
        openWindow(app.id, services);
        toggleStartMenu(false);
      });
      startMenuGrid.appendChild(item);
    }
    startMenu.appendChild(startMenuGrid);

    // Wire up the search filter.
    searchBox.addEventListener('input', () => {
      const query = searchBox.value.trim().toLowerCase();
      for (const item of startMenuGrid.querySelectorAll<HTMLElement>('.grc-start-menu-item')) {
        const label = item.querySelector('.grc-start-menu-item-label');
        const text = label ? label.textContent?.toLowerCase() ?? '' : '';
        (item as HTMLElement).style.display = text.includes(query) ? '' : 'none';
      }
    });

    // Start menu footer with sign-out.
    const startMenuFooter = document.createElement('div');
    startMenuFooter.className = 'grc-start-menu-footer';

    const signOutBtn = document.createElement('button');
    signOutBtn.className = 'grc-signout-btn';
    signOutBtn.innerHTML = '<span>\u{1F464}</span> Sign out';
    signOutBtn.addEventListener('click', () => {
      clickSound();
      toggleStartMenu(false);
      hide();
      if (onExit) onExit();
    });
    startMenuFooter.appendChild(signOutBtn);
    startMenu.appendChild(startMenuFooter);

    desktop.appendChild(startMenu);

    // Running apps area in the taskbar.
    const runningArea = document.createElement('div');
    runningArea.className = 'grc-taskbar-running';
    taskbar.appendChild(runningArea);

    // System tray (right side).
    const tray = document.createElement('div');
    tray.className = 'grc-taskbar-tray';

    const trayClock = document.createElement('div');
    trayClock.className = 'grc-taskbar-clock';

    const trayDate = document.createElement('div');
    trayDate.className = 'grc-taskbar-date';

    tray.appendChild(trayClock);
    tray.appendChild(trayDate);
    taskbar.appendChild(tray);

    desktop.appendChild(taskbar);

    // ---- Start menu toggle ----------------------------------------------
    function toggleStartMenu(open: boolean): void {
      startMenuOpen = open;
      startMenu.style.display = open ? 'flex' : 'none';
      if (open) {
        startBtn.classList.add('active');
      } else {
        startBtn.classList.remove('active');
      }
    }

    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clickSound();
      toggleStartMenu(!startMenuOpen);
    });

    // Click anywhere else closes the start menu.
    document.addEventListener('click', (_e) => {
      if (startMenuOpen && !_e.target || !startMenu.contains(_e.target as Node) && _e.target !== startBtn) {
        toggleStartMenu(false);
      }
    });

    // ---- Clock -----------------------------------------------------------
    function updateClock(): void {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      trayClock.textContent = `${hours}:${minutes}`;
      trayDate.textContent = now.toLocaleDateString(undefined, {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      });
    }

    updateClock();
    clockTimer = setInterval(updateClock, 1000);

    // Store references for window management.
    desktop.dataset.department = department;
    desktop.dataset.username = username;

    // Attach the window layer and taskbar running area to the instance via closure.
    (desktop as any)._windowLayer = windowLayer;
    (desktop as any)._runningArea = runningArea;
    (desktop as any)._services = services;

    return desktop;
  }

  /* ---------------------------------------------------------------------- */
  /* Window management                                                      */
  /* ---------------------------------------------------------------------- */

  /**
   * Open a window for the given app id, or focus it if already open.
   */
  function openWindow(id: string, services: GrcServices): void {
    const def = appMap.get(id);
    if (!def) return;

    // If the window is already open, restore/focus it.
    const existing = openWindows.get(id);
    if (existing) {
      if (existing.minimized) {
        restoreWindow(existing);
      } else {
        bringToFront(existing);
      }
      return;
    }

    if (def.launch) def.launch();

    const root = getRoot();
    const windowLayer = (root as any)._windowLayer as HTMLDivElement;
    const runningArea = (root as any)._runningArea as HTMLDivElement;

    // ---- Window container ----
    const win = document.createElement('div');
    win.className = 'grc-window grc-window-opening';
    win.style.width = `${def.width}px`;
    win.style.height = `${def.height}px`;

    // Center the window with a slight cascade offset.
    const offset = openWindows.size * 28;
    const maxLeft = window.innerWidth - def.width - 20;
    const maxTop = window.innerHeight - 48 - def.height; // don't overlap taskbar
    const left = Math.min(80 + offset, Math.max(20, maxLeft));
    const top = Math.min(60 + offset, Math.max(20, maxTop));
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
    win.style.zIndex = String(++zCounter);

    // ---- Title bar ----
    const titleBar = document.createElement('div');
    titleBar.className = 'grc-window-titlebar';

    const titleLeft = document.createElement('div');
    titleLeft.className = 'grc-window-title-left';

    const titleIcon = document.createElement('span');
    titleIcon.className = 'grc-window-title-icon';
    titleIcon.textContent = def.icon;

    const titleText = document.createElement('span');
    titleText.className = 'grc-window-title-text';
    titleText.textContent = def.title;

    titleLeft.appendChild(titleIcon);
    titleLeft.appendChild(titleText);
    titleBar.appendChild(titleLeft);

    const titleButtons = document.createElement('div');
    titleButtons.className = 'grc-window-title-buttons';

    const minBtn = document.createElement('button');
    minBtn.className = 'grc-window-btn grc-window-btn-min';
    minBtn.innerHTML = '&ndash;';
    minBtn.title = 'Minimize';

    const maxBtn = document.createElement('button');
    maxBtn.className = 'grc-window-btn grc-window-btn-max';
    maxBtn.innerHTML = '&#9633;';
    maxBtn.title = 'Maximize';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'grc-window-btn grc-window-btn-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close';

    titleButtons.appendChild(minBtn);
    titleButtons.appendChild(maxBtn);
    titleButtons.appendChild(closeBtn);
    titleBar.appendChild(titleButtons);
    win.appendChild(titleBar);

    // ---- Window body ----
    const body = document.createElement('div');
    body.className = 'grc-window-body';
    win.appendChild(body);

    // ---- Resize handle (bottom-right corner) ----
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'grc-window-resize';
    win.appendChild(resizeHandle);

    windowLayer.appendChild(win);

    // ---- Taskbar button ----
    const taskbarBtn = document.createElement('button');
    taskbarBtn.className = 'grc-taskbar-btn active';
    taskbarBtn.innerHTML = `<span class="grc-taskbar-btn-icon">${def.icon}</span><span class="grc-taskbar-btn-label">${def.title}</span>`;
    runningArea.appendChild(taskbarBtn);

    const managed: ManagedWindow = {
      def,
      element: win,
      body,
      taskbarBtn,
      minimized: false,
      maximized: false,
      savedRect: { left, top, width: def.width, height: def.height },
      cleanup: null,
    };
    openWindows.set(id, managed);

    // Render the app content into the body.
    def.render(services, body);

    // ---- Wire up controls ----
    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clickSound();
      minimizeWindow(managed);
    });

    maxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clickSound();
      toggleMaximize(managed);
    });

    // Double-click title bar also toggles maximize.
    titleBar.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      toggleMaximize(managed);
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clickSound();
      closeWindow(managed);
    });

    taskbarBtn.addEventListener('click', () => {
      clickSound();
      if (managed.minimized) {
        restoreWindow(managed);
      } else if (isFront(managed)) {
        minimizeWindow(managed);
      } else {
        bringToFront(managed);
      }
    });

    // Bring to front on any click in the window.
    win.addEventListener('mousedown', () => bringToFront(managed));

    // ---- Dragging ----
    const dragCleanup = makeDraggable(managed, titleBar);

    // ---- Resizing ----
    const resizeCleanup = makeResizable(managed, resizeHandle);

    managed.cleanup = () => {
      dragCleanup();
      resizeCleanup();
    };

    // Focus the new window.
    bringToFront(managed);
  }

  /** Close and dispose a window. */
  function closeWindow(mw: ManagedWindow): void {
    if (mw.cleanup) mw.cleanup();
    mw.element.classList.add('grc-window-closing');
    mw.taskbarBtn.classList.add('grc-taskbar-btn-closing');
    const el = mw.element;
    const btn = mw.taskbarBtn;
    openWindows.delete(mw.def.id);
    setTimeout(() => {
      el.remove();
      btn.remove();
    }, 180);
  }

  /** Minimize a window. */
  function minimizeWindow(mw: ManagedWindow): void {
    mw.minimized = true;
    mw.element.style.display = 'none';
    mw.taskbarBtn.classList.remove('active');
  }

  /** Restore a minimized window. */
  function restoreWindow(mw: ManagedWindow): void {
    mw.minimized = false;
    mw.element.style.display = '';
    mw.taskbarBtn.classList.add('active');
    bringToFront(mw);
  }

  /** Toggle maximize / restore. */
  function toggleMaximize(mw: ManagedWindow): void {
    if (mw.maximized) {
      // Restore.
      mw.maximized = false;
      const r = mw.savedRect;
      mw.element.style.left = `${r.left}px`;
      mw.element.style.top = `${r.top}px`;
      mw.element.style.width = `${r.width}px`;
      mw.element.style.height = `${r.height}px`;
      mw.element.classList.remove('grc-window-maximized');
    } else {
      // Maximize.
      mw.maximized = true;
      mw.savedRect = {
        left: parseInt(mw.element.style.left || '0', 10),
        top: parseInt(mw.element.style.top || '0', 10),
        width: mw.element.offsetWidth,
        height: mw.element.offsetHeight,
      };
      mw.element.classList.add('grc-window-maximized');
      mw.element.style.left = '0';
      mw.element.style.top = '0';
      mw.element.style.width = '100%';
      mw.element.style.height = 'calc(100% - 48px)';
    }
  }

  /** Bring a window to the front (highest z-index). */
  function bringToFront(mw: ManagedWindow): void {
    mw.element.style.zIndex = String(++zCounter);
    // Update taskbar active states.
    for (const w of openWindows.values()) {
      w.taskbarBtn.classList.toggle('active', w === mw && !w.minimized);
    }
  }

  /** Whether a window is the front-most (highest z-index). */
  function isFront(mw: ManagedWindow): boolean {
    const myZ = parseInt(mw.element.style.zIndex || '0', 10);
    for (const w of openWindows.values()) {
      if (w === mw) continue;
      const z = parseInt(w.element.style.zIndex || '0', 10);
      if (z > myZ) return false;
    }
    return true;
  }

  /**
   * Make a window draggable by its title bar.
   *
   * Uses pointer events for smooth dragging. When the window is maximized,
   * dragging restores it first.
   */
  function makeDraggable(mw: ManagedWindow, handle: HTMLElement): () => void {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    handle.addEventListener('mousedown', (e) => {
      // Don't drag when clicking the title bar buttons.
      if ((e.target as HTMLElement).closest('.grc-window-btn')) return;
      if (mw.maximized) return; // no drag when maximized

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(mw.element.style.left || '0', 10);
      startTop = parseInt(mw.element.style.top || '0', 10);
      e.preventDefault();
    });

    const onMove = (e: MouseEvent): void => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const winW = mw.element.offsetWidth;
      const winH = mw.element.offsetHeight;
      // Constrain so the window stays fully within the visible area and
      // never overlaps the taskbar (48px at the bottom).
      const minLeft = -winW + 80; // keep at least 80px visible on the right
      const maxLeft = window.innerWidth - 80; // keep at least 80px visible on the left
      const minTop = 0; // don't drag above the top
      const maxTop = window.innerHeight - 48 - winH; // window bottom can't enter taskbar
      const newLeft = Math.max(minLeft, Math.min(maxLeft, startLeft + dx));
      const newTop = Math.max(minTop, Math.min(maxTop, startTop + dy));
      mw.element.style.left = `${newLeft}px`;
      mw.element.style.top = `${newTop}px`;
    };

    const onUp = (): void => {
      dragging = false;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    // Return a cleanup function so listeners are removed when the window closes.
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }

  /**
   * Make a window resizable by dragging its bottom-right corner.
   *
   * Enforces a minimum size (300x200) and keeps the window within the
   * visible area (bottom can't overlap the taskbar).
   */
  function makeResizable(mw: ManagedWindow, handle: HTMLElement): () => void {
    let resizing = false;
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;

    const MIN_W = 300;
    const MIN_H = 200;

    handle.addEventListener('mousedown', (e) => {
      if (mw.maximized) return;
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = mw.element.offsetWidth;
      startH = mw.element.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });

    const onMove = (e: MouseEvent): void => {
      if (!resizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newW = Math.max(MIN_W, startW + dx);
      // Don't let the bottom edge enter the taskbar (48px).
      const currentTop = parseInt(mw.element.style.top || '0', 10);
      const maxH = window.innerHeight - 48 - currentTop;
      const newH = Math.max(MIN_H, Math.min(maxH, startH + dy));
      mw.element.style.width = `${newW}px`;
      mw.element.style.height = `${newH}px`;
    };

    const onUp = (): void => {
      resizing = false;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Public API                                                             */
  /* ---------------------------------------------------------------------- */

  /** Get the current root element, throwing if not mounted. */
  function getRoot(): HTMLDivElement {
    if (!root) throw new Error('Desktop overlay not mounted');
    return root;
  }

  function show(services: GrcServices, department = 'IT', username = 'admin'): void {
    if (visible) return;
    root = buildDesktop(services, department, username);
    document.body.appendChild(root);
    visible = true;
  }

  function hide(): void {
    if (clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
    if (root && root.parentNode) {
      root.parentNode.removeChild(root);
    }
    root = null;
    openWindows.clear();
    zCounter = 100;
    startMenuOpen = false;
    visible = false;
  }

  function isVisible(): boolean {
    return visible;
  }

  /** The exit callback (set by the caller). */
  let onExit: (() => void) | null = null;

  return {
    show,
    hide,
    isVisible,
    openWindow,
    get onExit() {
      return onExit;
    },
    set onExit(fn: (() => void) | null) {
      onExit = fn;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Desktop CSS                                                                 */
/* -------------------------------------------------------------------------- */

/** The full CSS for the desktop, taskbar, start menu, and windows. */
const DESKTOP_CSS = `
/* ---- Root desktop ------------------------------------------------------- */

#grc-desktop-root {
  position: fixed;
  inset: 0;
  z-index: 50000;
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 25% 15%, rgba(47, 129, 247, 0.06) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 85%, rgba(31, 111, 235, 0.05) 0%, transparent 55%),
    linear-gradient(135deg, #0a0e17 0%, #131a2a 45%, #0d1117 100%);
  color: #e6edf3;
  user-select: none;
}

/* ---- Desktop icons ------------------------------------------------------ */

.grc-desktop-icons {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 6px;
  max-height: calc(100% - 72px);
}

.grc-desktop-icon {
  width: 88px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s ease, transform 0.08s ease;
  position: relative;
}
.grc-desktop-icon:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}
.grc-desktop-icon:hover .grc-desktop-icon-img {
  filter: drop-shadow(0 2px 8px rgba(47, 129, 247, 0.3));
}
.grc-desktop-icon.selected {
  background: rgba(47, 129, 247, 0.18);
  outline: 1px solid rgba(47, 129, 247, 0.4);
}
.grc-desktop-icon-img {
  font-size: 34px;
  line-height: 1;
  transition: filter 0.15s ease;
}
.grc-desktop-icon-label {
  font-size: 11px;
  text-align: center;
  color: #e6edf3;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  word-break: break-word;
  max-width: 80px;
  line-height: 1.3;
}
.grc-desktop-icon::after {
  content: 'Double-click to open';
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}
.grc-desktop-icon:hover::after {
  opacity: 1;
}

/* ---- Window layer ------------------------------------------------------- */

.grc-window-layer {
  position: absolute;
  inset: 0;
  bottom: 48px;
  pointer-events: none;
  overflow: hidden;
}

/* ---- Windows ------------------------------------------------------------ */

.grc-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--grc-surface, #161b22);
  border: 1px solid var(--grc-border, #30363d);
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  pointer-events: auto;
  min-width: 200px;
  min-height: 120px;
}
.grc-window-opening {
  animation: grc-window-open 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.grc-window-closing {
  animation: grc-window-close 0.18s ease forwards;
}
@keyframes grc-window-open {
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes grc-window-close {
  to { opacity: 0; transform: scale(0.94); }
}
.grc-window-maximized {
  border-radius: 0;
  border: none;
}

.grc-window-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  padding: 0 0 0 14px;
  background: var(--grc-surface-elevated, #1c2330);
  border-bottom: 1px solid var(--grc-border-subtle, #21262d);
  cursor: default;
  flex-shrink: 0;
}
.grc-window-title-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.grc-window-title-icon {
  font-size: 16px;
  line-height: 1;
}
.grc-window-title-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--grc-text, #e6edf3);
  letter-spacing: 0.01em;
}
.grc-window-title-buttons {
  display: flex;
  height: 100%;
}
.grc-window-btn {
  width: 46px;
  height: 38px;
  border: none;
  background: transparent;
  color: var(--grc-text-dim, #8b949e);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease, color 0.12s ease;
}
.grc-window-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--grc-text, #e6edf3);
}
.grc-window-btn:active {
  background: rgba(255, 255, 255, 0.12);
}
.grc-window-btn-close:hover {
  background: #e81123;
  color: #fff;
}
.grc-window-btn-close:active {
  background: #c50f1f;
}

.grc-window-body {
  flex: 1;
  overflow: auto;
  background: var(--grc-surface, #161b22);
}

.grc-window-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  z-index: 10;
}
.grc-window-resize::after {
  content: '';
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 6px;
  height: 6px;
  border-right: 2px solid var(--grc-text-dim, #8b949e);
  border-bottom: 2px solid var(--grc-text-dim, #8b949e);
  opacity: 0.4;
}
.grc-window-resize:hover::after {
  opacity: 0.8;
}

/* ---- Taskbar ------------------------------------------------------------ */

.grc-taskbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  display: flex;
  align-items: center;
  background: rgba(13, 17, 23, 0.82);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  border-top: 1px solid var(--grc-border, #30363d);
  z-index: 99999;
  padding: 0 8px;
  gap: 6px;
  box-shadow: 0 -1px 0 rgba(47, 129, 247, 0.15);
}
.grc-taskbar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(47, 129, 247, 0.3), transparent);
}

.grc-start-btn {
  width: 44px;
  height: 40px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background 0.12s ease;
  flex-shrink: 0;
}
.grc-start-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
.grc-start-btn.active {
  background: rgba(47, 129, 247, 0.2);
  box-shadow: inset 0 0 0 1px rgba(47, 129, 247, 0.3);
}
.grc-start-icon {
  font-size: 20px;
}

.grc-taskbar-running {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  overflow: hidden;
}

.grc-taskbar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border: none;
  background: transparent;
  color: var(--grc-text, #e6edf3);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.12s ease;
  max-width: 200px;
  overflow: hidden;
  white-space: nowrap;
}
.grc-taskbar-btn:hover {
  background: rgba(255, 255, 255, 0.07);
}
.grc-taskbar-btn.active {
  background: rgba(47, 129, 247, 0.16);
  box-shadow: inset 0 -2px 0 var(--grc-accent, #2f81f7);
}
.grc-taskbar-btn-closing {
  animation: grc-taskbar-btn-close 0.18s ease forwards;
}
@keyframes grc-taskbar-btn-close {
  to { opacity: 0; transform: scaleX(0.9); }
}
.grc-taskbar-btn-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.grc-taskbar-btn-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.grc-taskbar-tray {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 0 14px;
  cursor: default;
  flex-shrink: 0;
  height: 100%;
  justify-content: center;
}
.grc-taskbar-clock {
  font-size: 12px;
  font-weight: 500;
  color: var(--grc-text, #e6edf3);
  line-height: 1.3;
}
.grc-taskbar-date {
  font-size: 10px;
  color: var(--grc-text-dim, #8b949e);
  line-height: 1.3;
}

/* ---- Start menu --------------------------------------------------------- */

.grc-start-menu {
  position: absolute;
  bottom: 52px;
  left: 8px;
  width: 440px;
  max-height: 560px;
  background: rgba(20, 25, 38, 0.92);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid var(--grc-border, #30363d);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.04);
  z-index: 100001;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  animation: grc-start-menu-open 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes grc-start-menu-open {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.grc-start-menu-header {
  padding: 20px 22px 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--grc-text, #e6edf3);
  border-bottom: 1px solid var(--grc-border-subtle, #21262d);
  display: flex;
  align-items: center;
  gap: 10px;
}
.grc-start-menu-header::before {
  content: '\u{1F464}';
  font-size: 18px;
}

.grc-start-menu-search-wrap {
  padding: 14px 18px 8px;
}
.grc-start-menu-search {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  font-family: inherit;
  border: 1px solid var(--grc-border, #30363d);
  border-radius: 6px;
  background: var(--grc-bg, #0d1117);
  color: var(--grc-text, #e6edf3);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.grc-start-menu-search:focus {
  border-color: var(--grc-accent, #2f81f7);
  box-shadow: 0 0 0 3px rgba(47, 129, 247, 0.18);
}
.grc-start-menu-search::placeholder {
  color: var(--grc-text-dim, #8b949e);
  opacity: 0.55;
}

.grc-start-menu-section-header {
  padding: 8px 22px 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--grc-text-dim, #8b949e);
}

.grc-start-menu-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 4px 16px 16px;
  overflow-y: auto;
  max-height: 360px;
}

.grc-start-menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s ease, transform 0.08s ease;
}
.grc-start-menu-item:hover {
  background: rgba(255, 255, 255, 0.07);
  transform: translateY(-1px);
}
.grc-start-menu-item:active {
  transform: translateY(0);
  background: rgba(255, 255, 255, 0.1);
}
.grc-start-menu-item-icon {
  font-size: 28px;
}
.grc-start-menu-item-label {
  font-size: 11px;
  text-align: center;
  color: var(--grc-text, #e6edf3);
  word-break: break-word;
  line-height: 1.3;
}

.grc-start-menu-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--grc-border-subtle, #21262d);
  display: flex;
  justify-content: flex-end;
}

.grc-signout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--grc-border, #30363d);
  border-radius: 6px;
  background: transparent;
  color: var(--grc-text, #e6edf3);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.grc-signout-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: var(--grc-text-dim, #8b949e);
}
`;
