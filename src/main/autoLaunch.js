const { app } = require('electron');

function applyAutoLaunch(enabled) {
  if (process.env.NODE_ENV === 'development') return;

  app.setLoginItemSettings({
    openAtLogin: !!enabled,
    name: 'Quizy',
    path: process.execPath
  });
}

function setupAutoLaunchFromConfig(getOpenAtLogin) {
  if (process.env.NODE_ENV === 'development') return;
  const enabled = typeof getOpenAtLogin === 'function' ? getOpenAtLogin() : !!getOpenAtLogin;
  applyAutoLaunch(enabled);
}

function getLoginItemOpenAtLogin() {
  if (process.env.NODE_ENV === 'development') return false;
  return app.getLoginItemSettings().openAtLogin;
}

module.exports = { applyAutoLaunch, setupAutoLaunchFromConfig, getLoginItemOpenAtLogin };
