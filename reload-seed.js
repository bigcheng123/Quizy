'use strict';

/**
 * Delete %APPDATA%/Quizy/quizy.db and re-import from data/seed-grade-*-{chinese|math}.json
 *
 * Usage: npm run reload-seed
 *        (or double-click reload-seed.bat)
 * Tip: Close Quizy before running, or the database file may be locked.
 */

const path = require('path');
const fs = require('fs');
const Module = require('module');

const userData = path.join(process.env.APPDATA || '', 'Quizy');
const seedDir = path.join(__dirname, 'data');

process.env.QUIZY_SEED_DIR = seedDir;

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'electron') {
    return {
      app: {
        getPath: (name) => (name === 'userData' ? userData : userData),
      },
    };
  }
  return originalRequire.apply(this, arguments);
};

const dbm = require('./src/main/db.js');

try {
  const { questionCount } = dbm.resetDbAndReloadSeed();
  const dbPath = dbm.getDbPath();
  const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

  console.log('userData:', userData);
  console.log('db_path:', dbPath);
  console.log('db_size_bytes:', dbSize);
  console.log('total_questions:', questionCount);
  console.log('OK: seed reloaded successfully');
} catch (err) {
  console.error('FAIL:', err.message || err);
  if (/EBUSY|EPERM|locked/i.test(String(err.message || err))) {
    console.error('Hint: close Quizy and run this script again.');
  }
  process.exit(1);
} finally {
  dbm.closeDb();
}
