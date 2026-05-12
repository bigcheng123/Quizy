const { app, BrowserWindow, globalShortcut, ipcMain, dialog } = require('electron');
const path = require('path');
const { setupAutoLaunch } = require('./autoLaunch');
const { initStore, getConfig } = require('./store');
const { initDb } = require('./db');
const { registerIpcHandlers } = require('./ipcHandlers');

const isDev = process.env.NODE_ENV === 'development';

let quizWindow = null;
let adminWindow = null;
let isUnlocked = false;

function destroyQuizWindow() {
  if (!quizWindow || quizWindow.isDestroyed()) {
    quizWindow = null;
    return;
  }
  try {
    if (quizWindow.isFullScreen()) quizWindow.setFullScreen(false);
  } catch (_) {}
  try {
    quizWindow.setAlwaysOnTop(false);
  } catch (_) {}
  try {
    quizWindow.setClosable(true);
  } catch (_) {}
  quizWindow.destroy();
  quizWindow = null;
}

function createQuizWindow() {
  quizWindow = new BrowserWindow({
    fullscreen: true,
    alwaysOnTop: true,
    frame: false,
    skipTaskbar: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/quizPreload.js'),
      devTools: isDev
    }
  });

  quizWindow.loadFile(path.join(__dirname, '../renderer/quiz/index.html'));

  quizWindow.on('close', (e) => {
    if (!isUnlocked) {
      e.preventDefault();
    }
  });

  quizWindow.on('blur', () => {
    if (!isUnlocked && quizWindow) {
      // 管理后台打开后答题窗会失焦；若此处再 focus，会把全屏锁屏抢回前台，导致无法进入后台。
      if (adminWindow && !adminWindow.isDestroyed()) {
        return;
      }
      quizWindow.focus();
    }
  });

  if (isDev) {
    quizWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function createAdminWindow() {
  if (adminWindow && !adminWindow.isDestroyed()) {
    adminWindow.focus();
    return;
  }

  adminWindow = new BrowserWindow({
    width: 900,
    height: 700,
    frame: true,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/adminPreload.js'),
      devTools: isDev
    }
  });

  adminWindow.loadFile(path.join(__dirname, '../renderer/admin/index.html'));

  adminWindow.on('closed', () => {
    adminWindow = null;
    if (quizWindow && !quizWindow.isDestroyed()) {
      quizWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  initStore();
  initDb();
  setupAutoLaunch();
  registerIpcHandlers({ getQuizWindow: () => quizWindow, getAdminWindow: () => adminWindow, createAdminWindow });

  globalShortcut.register('Alt+F4', () => {});
  globalShortcut.register('CommandOrControl+W', () => {});
  globalShortcut.register('CommandOrControl+R', () => {});
  globalShortcut.register('F5', () => {});
  globalShortcut.register('F11', () => {});

  createQuizWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createQuizWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('unlock-desktop', () => {
  isUnlocked = true;
  if (adminWindow && !adminWindow.isDestroyed()) {
    adminWindow.destroy();
  }
  adminWindow = null;
  destroyQuizWindow();
  app.quit();
});

/** 隐藏应急出口：答题页 Ctrl+Q / Cmd+Q，供开发与家长从全屏锁死状态退出（勿告知儿童）。 */
ipcMain.on('emergency-quit', () => {
  isUnlocked = true;
  if (adminWindow && !adminWindow.isDestroyed()) {
    adminWindow.destroy();
  }
  adminWindow = null;
  destroyQuizWindow();
  app.quit();
});

ipcMain.on('open-admin', () => {
  createAdminWindow();
});

module.exports = { getQuizWindow: () => quizWindow };
