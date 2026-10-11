const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherAPI', {
  getVersionList: () => ipcRenderer.invoke('get-version-list'),
  selectVersionsDir: () => ipcRenderer.invoke('select-versions-dir'),
  launchVersion: (filePath) => ipcRenderer.invoke('launch-version', filePath),
  openVersionsFolder: () => ipcRenderer.invoke('open-versions-folder')
});
