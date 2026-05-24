'use strict';

const path = require('path');
const fs = require('fs');
const Module = require('module');

const userData = path.join(process.env.APPDATA || '', 'Quizy');
const seedDir = path.join(__dirname, '../data');

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

const dbm = require('../src/main/db.js');

dbm.initDb();

const total = dbm.getAllQuestions({}).length;
const g1Math = dbm.getQuestionCount('math', 1);
const g1Chinese = dbm.getQuestionCount('chinese', 1);
const allG1Math = dbm.getAllQuestions({ subject: 'math', grade: 1 });
const markers = [
  '37 + 40 = （ ）',
  '原来有 24 只鸟',
  '直接写出得数：83 − 7',
];
const found = markers.filter((m) => allG1Math.some((q) => q.content.includes(m)));
const dbPath = path.join(userData, 'quizy.db');
const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

console.log('userData:', userData);
console.log('db_path:', dbPath);
console.log('db_size_bytes:', dbSize);
console.log('total_questions:', total);
console.log('grade1_math:', g1Math);
console.log('grade1_chinese:', g1Chinese);
console.log('expected_total:', 4070);
console.log('benchmarks_found:', found.length, '/', markers.length);

dbm.closeDb();

if (total !== 4070 || found.length !== markers.length) {
  console.error('FAIL: import verification failed');
  process.exit(1);
}
console.log('OK: seed imported successfully');
