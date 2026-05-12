const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function getUserDataPath() {
  if (process.env.QUIZY_TEST_USERDATA) {
    return process.env.QUIZY_TEST_USERDATA;
  }
  return require('electron').app.getPath('userData');
}

function closeDb() {
  if (db) {
    try {
      db.close();
    } catch (_) {
      /* ignore */
    }
    db = undefined;
  }
}

function initDb() {
  if (process.env.QUIZY_TEST_USERDATA && db) {
    closeDb();
  }
  const userDataPath = getUserDataPath();
  const dbPath = path.join(userDataPath, 'quizy.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      grade INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      options TEXT,
      answer TEXT NOT NULL,
      image_path TEXT
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      subject TEXT NOT NULL,
      question_id INTEGER NOT NULL,
      is_correct INTEGER NOT NULL,
      answered_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_questions_subject_grade ON questions(subject, grade);
    CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
  `);

  seedIfEmpty();
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM questions').get().cnt;
  if (count > 0) return;
  if (process.env.QUIZY_SKIP_SEED === '1') return;

  const seedPath = process.env.QUIZY_SEED_PATH
    ? process.env.QUIZY_SEED_PATH
    : path.join(
        process.env.NODE_ENV === 'development'
          ? path.join(__dirname, '../../..', 'data', 'seed.json')
          : path.join(process.resourcesPath, 'data', 'seed.json')
      );

  if (!fs.existsSync(seedPath)) return;

  const questions = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const insert = db.prepare(`
    INSERT INTO questions (subject, grade, type, content, options, answer, image_path)
    VALUES (@subject, @grade, @type, @content, @options, @answer, @image_path)
  `);

  const insertMany = db.transaction((qs) => {
    for (const q of qs) {
      insert.run({
        subject: q.subject,
        grade: q.grade,
        type: q.type,
        content: q.content,
        options: q.options ? JSON.stringify(q.options) : null,
        answer: q.answer,
        image_path: q.image_path || null
      });
    }
  });

  insertMany(questions);
}

function getRandomQuestion(subject, grade, excludeIds = []) {
  const placeholders = excludeIds.length > 0 ? excludeIds.map(() => '?').join(',') : null;
  const sql = placeholders
    ? `SELECT * FROM questions WHERE subject = ? AND grade = ? AND id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`
    : `SELECT * FROM questions WHERE subject = ? AND grade = ? ORDER BY RANDOM() LIMIT 1`;

  const params = placeholders ? [subject, grade, ...excludeIds] : [subject, grade];
  const row = db.prepare(sql).get(...params);
  if (!row) return null;

  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : null
  };
}

function addRecord(subject, questionId, isCorrect) {
  const now = new Date();
  db.prepare(`
    INSERT INTO records (date, subject, question_id, is_correct, answered_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    now.toISOString().slice(0, 10),
    subject,
    questionId,
    isCorrect ? 1 : 0,
    now.toISOString()
  );
}

function getRecords(date) {
  const sql = date
    ? 'SELECT * FROM records WHERE date = ? ORDER BY answered_at DESC'
    : 'SELECT * FROM records ORDER BY answered_at DESC LIMIT 200';
  return date ? db.prepare(sql).all(date) : db.prepare(sql).all();
}

function getRecordDates() {
  return db.prepare('SELECT DISTINCT date FROM records ORDER BY date DESC LIMIT 30').all();
}

function getAllQuestions({ subject, grade, type } = {}) {
  let sql = 'SELECT * FROM questions WHERE 1=1';
  const params = [];
  if (subject) { sql += ' AND subject = ?'; params.push(subject); }
  if (grade) { sql += ' AND grade = ?'; params.push(grade); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY grade, subject, id';
  const rows = db.prepare(sql).all(...params);
  return rows.map(r => ({ ...r, options: r.options ? JSON.parse(r.options) : null }));
}

function addQuestion(q) {
  const result = db.prepare(`
    INSERT INTO questions (subject, grade, type, content, options, answer, image_path)
    VALUES (@subject, @grade, @type, @content, @options, @answer, @image_path)
  `).run({
    subject: q.subject,
    grade: q.grade,
    type: q.type,
    content: q.content,
    options: q.options ? JSON.stringify(q.options) : null,
    answer: q.answer,
    image_path: q.image_path || null
  });
  return result.lastInsertRowid;
}

function updateQuestion(id, q) {
  db.prepare(`
    UPDATE questions SET subject=@subject, grade=@grade, type=@type,
    content=@content, options=@options, answer=@answer, image_path=@image_path
    WHERE id=@id
  `).run({
    id,
    subject: q.subject,
    grade: q.grade,
    type: q.type,
    content: q.content,
    options: q.options ? JSON.stringify(q.options) : null,
    answer: q.answer,
    image_path: q.image_path || null
  });
}

function deleteQuestion(id) {
  db.prepare('DELETE FROM questions WHERE id = ?').run(id);
}

function getQuestionCount(subject, grade) {
  return db.prepare('SELECT COUNT(*) as cnt FROM questions WHERE subject = ? AND grade = ?').get(subject, grade).cnt;
}

module.exports = {
  initDb,
  closeDb,
  getRandomQuestion,
  addRecord,
  getRecords,
  getRecordDates,
  getAllQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionCount
};
