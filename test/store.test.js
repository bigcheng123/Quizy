'use strict';

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const storePath = path.join(__dirname, '..', 'src', 'main', 'store.js');

function loadStore() {
  return require(storePath);
}

function unloadStore() {
  delete require.cache[require.resolve(storePath)];
}

afterEach(() => {
  unloadStore();
});

test('initStore with temp cwd: defaults, getConfig, setConfig', (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'quizy-store-'));
  t.after(() => {
    try {
      fs.rmSync(cwd, { recursive: true, force: true });
    } catch (_) {
      /* ignore */
    }
  });
  const name = `quizy-test-${Date.now()}`;
  const storeMod = loadStore();
  storeMod.initStore({
    cwd,
    name,
    projectVersion: '9.9.9-test'
  });
  const cfg = storeMod.getConfig();
  assert.equal(cfg.grade, 3);
  assert.equal(cfg.adminPassword, '123456');
  assert.deepEqual(cfg.unlockRequirements, { chinese: 5, math: 5 });
  assert.equal(cfg.adminSecretClickCount, 5);

  storeMod.setConfig('grade', 6);
  assert.equal(storeMod.getConfig().grade, 6);
  storeMod.setConfig('unlockRequirements', { chinese: 2, math: 3 });
  assert.deepEqual(storeMod.getConfig().unlockRequirements, { chinese: 2, math: 3 });

  const file = path.join(cwd, `${name}.json`);
  assert.ok(fs.existsSync(file));
});

test('initStore rejects invalid schema value from Conf', (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'quizy-store-'));
  t.after(() => {
    try {
      fs.rmSync(cwd, { recursive: true, force: true });
    } catch (_) {
      /* ignore */
    }
  });
  const name = `quizy-test-invalid-${Date.now()}`;
  const storeMod = loadStore();
  storeMod.initStore({ cwd, name, projectVersion: '9.9.9-test' });
  assert.throws(() => storeMod.setConfig('grade', 'not-a-number'), (err) => {
    assert.ok(err instanceof Error);
    assert.match(err.message, /grade|number/i);
    return true;
  });
});
