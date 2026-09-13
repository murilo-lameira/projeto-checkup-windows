const path = require('path');
const fs = require('fs');
const os = require('os');

// Log de diagnóstico persistente no diretório do usuário
const logFile = path.join(os.homedir(), 'checkup_app.log');
function log(msg) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (_) {}
}

// 1. Trata casos onde o ambiente/terminal injetou ELECTRON_RUN_AS_NODE=1 (ex: VS Code / IDEs)
if (process.env.ELECTRON_RUN_AS_NODE) {
  log('Detectado ELECTRON_RUN_AS_NODE=1. Reiniciando processo sem essa flag...');
  const { spawn } = require('child_process');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  let targetBinary = process.execPath;
  let args = process.argv.slice(1);

  try {
    const electron = require('electron');
    if (typeof electron === 'string') {
      targetBinary = electron;
    }
  } catch (_) {}

  const child = spawn(targetBinary, args, {
    stdio: 'ignore',
    env,
    detached: true
  });
  child.unref();
  process.exit(0);
}

// 2. Importação do Electron e captura de erros globais
const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;

process.on('uncaughtException', (err) => {
  log(`Uncaught Exception: ${err && (err.stack || err.message || err)}`);
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled Rejection: ${reason && (reason.stack || reason.message || reason)}`);
});

log(`Iniciando CheckUP Windows (PID: ${process.pid}, isPackaged: ${app.isPackaged})`);

// 3. Garantir instância única (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log('Outra instância já está em execução. Encerrando esta...');
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  log('Segunda instância disparada; trazendo janela existente para frente.');
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    const win = windows[0];
    if (win.isMinimized()) win.restore();
    win.focus();
    win.show();
  }
});

// 4. Handlers IPC
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

// 5. Reloader apenas em desenvolvimento
if (!app.isPackaged) {
  try {
    require('electron-reloader')(module, {
      ignore: [/relatorios/, /historico/, /core/]
    });
  } catch (_) {}
}

// 6. Criação e exibição da Janela Principal
function createWindow() {
  log('Criando BrowserWindow...');
  const iconPath = path.join(__dirname, 'src', 'assets', 'icons', 'exame.png');

  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    backgroundColor: '#0d0c0f',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  });

  win.once('ready-to-show', () => {
    log('Evento ready-to-show emitido. Exibindo janela...');
    win.show();
  });

  // Fallback de segurança: se ready-to-show demorar mais de 1.5s, força a exibição da janela
  setTimeout(() => {
    if (win && !win.isDestroyed() && !win.isVisible()) {
      log('Fallback timeout atingido. Forçando exibição da janela...');
      win.show();
    }
  }, 1500);

  const htmlPath = path.join(__dirname, 'src', 'index.html');
  win.loadFile(htmlPath).catch((err) => {
    log(`Erro ao carregar index.html (${htmlPath}): ${err.message}`);
  });

  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  log('app.whenReady() concluído com sucesso.');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log('Todas as janelas fechadas. Encerrando app.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});