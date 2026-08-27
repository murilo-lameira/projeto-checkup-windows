const { app, BrowserWindow } = require('electron');
const path = require('path');
// Ativa o recarregamento automático durante o desenvolvimento
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

  // Carrega a interface visual
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  
  // Remove o menu superior padrão do Windows para um visual limpo
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