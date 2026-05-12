const { app } = require('electron');

function setupAutoLaunch() {
  if (process.env.NODE_ENV === 'development') return;

  app.setLoginItemSettings({
    openAtLogin: true,
    name: 'Quizy',
    path: process.execPath
  });
}

function disableAutoLaunch() {
  app.setLoginItemSettings({
    openAtLogin: false,
    name: 'Quizy'
  });
}

module.exports = { setupAutoLaunch, disableAutoLaunch };
