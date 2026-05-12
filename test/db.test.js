'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbm = require(path.join(__dirname, '..', 'src', 'main', 'db.js'));

beforeEach(() => {
  process.env.QUIZY_TEST_USERDATA = fs.mkdtempSync(path.join(os.tmpdir(), 'quizy-db-'));
  process.env.QUIZY_SKIP_SEED = '1';
  delete process.env.QUIZY_SEED_PATH;
  dbm.initDb();
});

afterEach(() => {
  const tmp = process.env.QUIZY_TEST_USERDATA;
  dbm.closeDb();
  delete process.env.QUIZY_TEST_USERDATA;
  delete process.env.QUIZY_SKIP_SEED;
  delete process.env.QUIZY_SEED_PATH;
  if (tmp && fs.existsSync(tmp)) {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('addQuestion and getAllQuestions', () => {
  const id = dbm.addQuestion({
    subject: 'math',
    grade: 2,
    type: 'fill',
    content: '2+2=?',
    options: null,
    answer: '4',
    image_path: null
  });
  assert.ok(Number.isInteger(Number(id)) && id > 0);
  const list = dbm.getAllQuestions({ subject: 'math', grade: 2 });
  assert.equal(list.length, 1);
  assert.equal(list[0].answer, '4');
  assert.equal(list[0].options, null);
});

test('getRandomQuestion respects excludeIds and exhausts pool', () => {
  const id1 = dbm.addQuestion({
    subject: 'chinese',
    grade: 1,
    type: 'choice',
    content: 'Q1',
    options: ['x', 'y', 'z', 'w'],
    answer: 'x',
    image_path: null
  });
  const id2 = dbm.addQuestion({
    subject: 'chinese',
    grade: 1,
    type: 'choice',
    content: 'Q2',
    options: ['a', 'b', 'c', 'd'],
    answer: 'a',
    image_path: null
  });
  const q = dbm.getRandomQuestion('chinese', 1, [id1]);
  assert.ok(q);
  assert.equal(q.id, id2);
  const none = dbm.getRandomQuestion('chinese', 1, [id1, id2]);
  assert.equal(none, null);
});

test('addRecord getRecords getRecordDates', () => {
  dbm.addQuestion({
    subject: 'math',
    grade: 3,
    type: 'judge',
    content: '1>0',
    options: null,
    answer: '正确',
    image_path: null
  });
  const rows = dbm.getAllQuestions({});
  const qid = rows[0].id;
  dbm.addRecord('math', qid, true);
  dbm.addRecord('math', qid, false);
  const dates = dbm.getRecordDates();
  assert.ok(Array.isArray(dates) && dates.length >= 1);
  const today = dates[0].date;
  const recs = dbm.getRecords(today);
  assert.equal(recs.length, 2);
  assert.ok(recs.every((r) => r.subject === 'math'));
});

test('seedIfEmpty imports when QUIZY_SEED_PATH set', () => {
  delete process.env.QUIZY_SKIP_SEED;
  process.env.QUIZY_SEED_PATH = path.join(__dirname, 'fixtures', 'mini-seed.json');
  dbm.closeDb();
  dbm.initDb();
  const n = dbm.getQuestionCount('chinese', 3);
  assert.equal(n, 2);
});

test('updateQuestion deleteQuestion getQuestionCount', () => {
  const id = dbm.addQuestion({
    subject: 'chinese',
    grade: 4,
    type: 'fill',
    content: '原',
    options: null,
    answer: '甲',
    image_path: null
  });
  assert.equal(dbm.getQuestionCount('chinese', 4), 1);
  dbm.updateQuestion(id, {
    subject: 'chinese',
    grade: 4,
    type: 'fill',
    content: '改',
    options: null,
    answer: '乙',
    image_path: null
  });
  const one = dbm.getAllQuestions({ subject: 'chinese', grade: 4 });
  assert.equal(one[0].content, '改');
  dbm.deleteQuestion(id);
  assert.equal(dbm.getQuestionCount('chinese', 4), 0);
});
