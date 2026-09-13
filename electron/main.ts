/**
 * Electron main process for GRC Range.
 *
 * Creates a browser window that loads the Vite-built app from dist/.
 * On startup it checks GitHub releases for updates via electron-updater.
 * The app runs fully offline — the update check is best-effort and
 * silently skips if there is no internet connection.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'GRC Range',
    backgroundColor: '#0d1117',
    icon: join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the built Vite app.
  mainWindow.loadFile(join(__dirname, 'dist', 'index.html'));

  // Open DevTools in development.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---- Auto-update ----
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-available');
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});

// IPC: let the renderer trigger "quit and install" after an update.
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

// IPC: let the renderer check for updates manually.
ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates().catch(() => {
    // Best-effort — ignore network errors.
  });
});

// ---- App lifecycle ----
app.whenReady().then(() => {
  createWindow();

  // Check for updates on startup (best-effort).
  autoUpdater.checkForUpdates().catch(() => {
    // No internet or no releases — that's fine.
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
