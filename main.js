const electron = require('electron');

if (typeof electron === 'string') {
  // Previne erro caso o terminal/ambiente tenha ELECTRON_RUN_AS_NODE=1
  const { spawn } = require('child_process');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(electron, process.argv.slice(1), { stdio: 'inherit', env });
  child.on('close', (code) => process.exit(code ?? 0));
  return;
}

var { app, BrowserWindow, ipcMain } = electron;
const path = require('path');

if (ipcMain) {
  ipcMain.removeHandler('get-file-icon');
  ipcMain.handle('get-file-icon', async (event, filePath) => {
    try {
      if (!filePath) return null;
      const icon = await app.getFileIcon(filePath, { size: 'small' });
      return icon.toDataURL();
    } catch (_) {
      return null;
    }
  });
}


try {
  require('electron-reloader')(module, {
    ignore: [/relatorios/, /historico/, /core/]
  });
} catch (_) {}

function createWindow () {
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    backgroundColor: '#0d0c0f', // Nossa cor Ultra-Dark
    icon: path.join(__dirname, 'src', 'assets', 'icons', 'exame.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

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