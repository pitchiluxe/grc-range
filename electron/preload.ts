/**
 * Electron preload script — exposes a minimal API to the renderer.
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('grcUpdater', {
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateAvailable: (cb: () => void) => ipcRenderer.on('update-available', cb),
  onUpdateDownloaded: (cb: () => void) => ipcRenderer.on('update-downloaded', cb),
});
