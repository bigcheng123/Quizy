const Store = require('electron-store');

const schema = {
  grade: { type: 'number', default: 3 },
  adminPassword: { type: 'string', default: '123456' },
  unlockRequirements: {
    type: 'object',
    default: { chinese: 5, math: 5 }
  },
  adminSecretClickCount: { type: 'number', default: 5 }
};

let store;

function initStore(options = {}) {
  store = new Store({ ...options, schema });
}

function getConfig() {
  return {
    grade: store.get('grade'),
    adminPassword: store.get('adminPassword'),
    unlockRequirements: store.get('unlockRequirements'),
    adminSecretClickCount: store.get('adminSecretClickCount')
  };
}

function setConfig(key, value) {
  store.set(key, value);
}

module.exports = { initStore, getConfig, setConfig };
