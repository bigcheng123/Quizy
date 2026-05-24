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
  delete process.env.QUIZY_SEED_DIR;
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

test('getRandomQuestion filters by question types', () => {
  dbm.addQuestion({
    subject: 'math',
    grade: 2,
    type: 'fill',
    content: 'fill',
    options: null,
    answer: '1',
    image_path: null
  });
  dbm.addQuestion({
    subject: 'math',
    grade: 2,
    type: 'choice',
    content: 'choice',
    options: ['a', 'b', 'c', 'd'],
    answer: 'a',
    image_path: null
  });
  const onlyFill = dbm.getRandomQuestion('math', 2, [], ['fill']);
  assert.equal(onlyFill.type, 'fill');
});

test('getCorrectQuestionIds returns mastered questions for subject and grade', () => {
  const id = dbm.addQuestion({
    subject: 'chinese',
    grade: 3,
    type: 'judge',
    content: 'T',
    options: null,
    answer: '正确',
    image_path: null
  });
  dbm.addRecord('chinese', id, true);
  dbm.addRecord('chinese', id, false);
  const ids = dbm.getCorrectQuestionIds('chinese', 3);
  assert.deepEqual(ids, [id]);
  assert.deepEqual(dbm.getCorrectQuestionIds('math', 3), []);
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

test('repo seed-grade-*-{chinese|math}.json exist under data/', () => {
  const dataDir = path.join(__dirname, '..', 'data');
  for (let g = 1; g <= 6; g++) {
    for (const subj of ['chinese', 'math']) {
      const seedPath = path.join(dataDir, `seed-grade-${g}-${subj}.json`);
      assert.ok(fs.existsSync(seedPath), `missing seed: ${seedPath}`);
      const qs = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
      assert.ok(Array.isArray(qs) && qs.length > 0, `empty seed: ${seedPath}`);
      assert.ok(
        qs.every((q) => q.grade === g && q.subject === subj),
        `seed-grade-${g}-${subj}.json contains wrong grade/subject`
      );
    }
  }
});

test('seedIfEmpty imports all grade seed files when QUIZY_SEED_DIR set', () => {
  delete process.env.QUIZY_SKIP_SEED;
  delete process.env.QUIZY_SEED_PATH;
  process.env.QUIZY_SEED_DIR = path.join(__dirname, '..', 'data');
  dbm.closeDb();
  dbm.initDb();
  assert.ok(dbm.getQuestionCount('chinese', 1) > 0);
  assert.ok(dbm.getQuestionCount('math', 6) > 0);
  delete process.env.QUIZY_SEED_DIR;
});

test('mergeSeedIfBehind adds only missing seed rows', () => {
  delete process.env.QUIZY_SKIP_SEED;
  process.env.QUIZY_SEED_PATH = path.join(__dirname, 'fixtures', 'mini-seed.json');
  dbm.addQuestion({
    subject: 'chinese',
    grade: 3,
    type: 'choice',
    content: '测试题 A',
    options: ['A', 'B', 'C', 'D'],
    answer: 'A',
    image_path: null
  });
  dbm.closeDb();
  dbm.initDb();
  assert.equal(dbm.getAllQuestions({}).length, 2);
});

test('seedIfEmpty imports when QUIZY_SEED_PATH set', () => {
  delete process.env.QUIZY_SKIP_SEED;
  process.env.QUIZY_SEED_PATH = path.join(__dirname, 'fixtures', 'mini-seed.json');
  dbm.closeDb();
  dbm.initDb();
  const n = dbm.getQuestionCount('chinese', 3);
  assert.equal(n, 2);
});

test('getQuestionAnswerStats aggregates per question', () => {
  const id = dbm.addQuestion({
    subject: 'math',
    grade: 2,
    type: 'fill',
    content: '1+1',
    options: null,
    answer: '2',
    image_path: null
  });
  dbm.addRecord('math', id, true);
  dbm.addRecord('math', id, true);
  dbm.addRecord('math', id, false);
  const stats = dbm.getQuestionAnswerStats();
  assert.deepEqual(stats[id], { total: 3, correct_count: 2, rate: 67 });
  assert.equal(stats[99999], undefined);
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
