const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const isDev = !app.isPackaged;
const appRoot = app.getAppPath();
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'launcher-config.json');

let mainWindow;

function readConfig() {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { versionsDir: appRoot };
  }
}

function writeConfig(data) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

function getVersionFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
    .map((entry) => {
      const filename = entry.name;
      const displayName = filename.replace(/\.html$/i, '');
      const filePath = path.join(dirPath, filename);
      const stat = fs.statSync(filePath);
      const size = stat.size;
      
      let type = 'Custom';
      if (filename.toLowerCase().includes('eaglercraft') || filename.toLowerCase().includes('eaglerforge') || filename.toLowerCase().startsWith('eagly')) {
        type = 'Eaglercraft';
      } else if (filename.toLowerCase().includes('absolutecraft') || filename.toLowerCase().startsWith('ac-')) {
        type = 'AbsoluteCraft';
      } else if (filename.toLowerCase().includes('minceraft') || filename.toLowerCase().includes('wolfycraft')) {
        type = 'WolfyCraft';
      }

      return {
        name: filename,
        displayName,
        path: filePath,
        size,
        type,
        sizeFormatted: formatFileSize(size)
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function groupVersionsByType(versions) {
  const grouped = {};
  versions.forEach((v) => {
    if (!grouped[v.type]) {
      grouped[v.type] = [];
    }
    grouped[v.type].push(v);
  });
  return grouped;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#090b12',
    autoHideMenuBar: true,
    title: 'Ultra Launcher',
    webPreferences: {
      preload: path.join(appRoot, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(appRoot, 'renderer', 'index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

ipcMain.handle('get-version-list', () => {
  const config = readConfig();
  const versions = getVersionFiles(config.versionsDir);
  const grouped = groupVersionsByType(versions);
  return { versions, grouped, currentPath: config.versionsDir };
});

ipcMain.handle('select-versions-dir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (canceled || !filePaths[0]) {
    return null;
  }

  const versionsDir = filePaths[0];
  const config = readConfig();
  config.versionsDir = versionsDir;
  writeConfig(config);
  
  const versions = getVersionFiles(versionsDir);
  const grouped = groupVersionsByType(versions);
  return { versions, grouped, currentPath: versionsDir };
});

ipcMain.handle('launch-version', (_event, filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('Selected version file does not exist.');
  }

  const filename = path.basename(filePath);
  const launchWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#020610',
    title: filename.replace(/\.html$/i, ''),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  launchWindow.loadURL(`file://${filePath}`);
  launchWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  
  launchWindow.once('ready-to-show', () => {
    launchWindow.show();
  });
});

ipcMain.handle('open-versions-folder', () => {
  const config = readConfig();
  const target = path.resolve(config.versionsDir);
  
  try {
    if (process.platform === 'darwin') {
      execSync(`open "${target}"`);
    } else if (process.platform === 'win32') {
      execSync(`start "" "${target}"`, { shell: true });
    } else {
      execSync(`xdg-open "${target}"`);
    }
  } catch (e) {
    console.error('Failed to open folder:', e);
  }
  
  return target;
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
