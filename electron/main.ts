/**
 * Electron main process for GRC Range.
 *
 * Creates a browser window that loads the Vite-built app from dist/.
 * On startup it checks GitHub releases for updates via electron-updater.
 * The app runs fully offline — the update check is best-effort and
 * silently skips if there is no internet connection.
 *
 * Path layout:
 *   __dirname = electron/dist/  (both in dev and inside app.asar)
 *   Renderer  = ../../dist/index.html  (Vite build output)
 *   Icon      = ../../public/favicon.ico
 *   Preload   = preload.js  (same dir as main.js)
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';

// electron-updater is imported lazily (after app.whenReady) because it
// calls app.getVersion() at construction time, which crashes if the
// app module isn't fully initialized yet.
type AutoUpdater = { autoDownload: boolean; autoInstallOnAppQuit: boolean; on: (event: string, cb: () => void) => void; checkForUpdates: () => Promise<unknown>; quitAndInstall: () => void };
let _autoUpdater: AutoUpdater | null = null;
function getAutoUpdater(): AutoUpdater | null {
  if (!_autoUpdater) {
    try {
      _autoUpdater = require('electron-updater').autoUpdater;
    } catch {
      _autoUpdater = null;
    }
  }
  return _autoUpdater;
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const iconPath = join(__dirname, '..', '..', 'public', 'favicon.ico');
  const preloadPath = join(__dirname, 'preload.js');
  const rendererPath = join(__dirname, '..', '..', 'dist', 'index.html');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'GRC Range',
    backgroundColor: '#0d1117',
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(rendererPath);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---- App lifecycle ----
app.whenReady().then(() => {
  createWindow();

  // Set up auto-updater after the app is ready (avoids the getVersion crash).
  try {
    const updater = getAutoUpdater();
    if (updater) {
      updater.autoDownload = true;
      updater.autoInstallOnAppQuit = true;

      updater.on('error', () => {
        // Best-effort — ignore all update errors.
      });

      updater.on('update-available', () => {
        if (mainWindow) mainWindow.webContents.send('update-available');
      });

      updater.on('update-downloaded', () => {
        if (mainWindow) mainWindow.webContents.send('update-downloaded');
      });

      // Check for updates on startup (best-effort).
      updater.checkForUpdates().catch(() => {
        // No internet or no releases — that's fine.
      });
    }
  } catch {
    // If electron-updater fails to initialize, the app still works.
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// IPC: let the renderer trigger "quit and install" after an update.
ipcMain.on('install-update', () => {
  try {
    const updater = getAutoUpdater();
    if (updater) updater.quitAndInstall();
  } catch {
    // No updater available — ignore.
  }
});

// IPC: let the renderer check for updates manually.
ipcMain.on('check-for-updates', () => {
  try {
    const updater = getAutoUpdater();
    if (updater) {
      updater.checkForUpdates().catch(() => {
        // Best-effort — ignore network errors.
      });
    }
  } catch {
    // No updater available — ignore.
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
