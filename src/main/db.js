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

function getDbPath() {
  return path.join(getUserDataPath(), 'quizy.db');
}

function deleteDbFiles() {
  const dbPath = getDbPath();
  for (const p of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

/** 删除本地 quizy.db 并从 seed 重新导入（会清空答题记录与手动增删的题目）。 */
function resetDbAndReloadSeed() {
  closeDb();
  deleteDbFiles();
  initDb();
  const questionCount = db.prepare('SELECT COUNT(*) AS cnt FROM questions').get().cnt;
  return { questionCount };
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
  mergeSeedIfBehind();
}

const SEED_SUBJECTS = ['chinese', 'math'];

function resolveSeedPaths() {
  if (process.env.QUIZY_SEED_PATH) return [process.env.QUIZY_SEED_PATH];
  const dirs = [];
  if (process.env.QUIZY_SEED_DIR) dirs.push(process.env.QUIZY_SEED_DIR);
  dirs.push(
    path.join(__dirname, '../..', 'data'),
    path.join(process.resourcesPath || '', 'data')
  );
  for (const dir of dirs) {
    if (!dir || !fs.existsSync(dir)) continue;
    const subjectFiles = [];
    for (let g = 1; g <= 6; g++) {
      for (const subj of SEED_SUBJECTS) {
        const p = path.join(dir, `seed-grade-${g}-${subj}.json`);
        if (fs.existsSync(p)) subjectFiles.push(p);
      }
    }
    if (subjectFiles.length) return subjectFiles;
    const gradeFiles = [];
    for (let g = 1; g <= 6; g++) {
      const p = path.join(dir, `seed-grade-${g}.json`);
      if (fs.existsSync(p)) gradeFiles.push(p);
    }
    if (gradeFiles.length) return gradeFiles;
    const legacy = path.join(dir, 'seed.json');
    if (fs.existsSync(legacy)) return [legacy];
  }
  return [];
}

function loadSeedQuestions() {
  const paths = resolveSeedPaths();
  const all = [];
  for (const p of paths) {
    const qs = JSON.parse(fs.readFileSync(p, 'utf-8'));
    if (Array.isArray(qs)) all.push(...qs);
  }
  return all;
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM questions').get().cnt;
  if (count > 0) return;
  if (process.env.QUIZY_SKIP_SEED === '1') return;

  const seedPaths = resolveSeedPaths();
  if (!seedPaths.length) return;

  const questions = loadSeedQuestions();
  if (!questions.length) return;
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

/** 种子文件题目多于数据库时，按 (subject, grade, content) 补全缺失题（不删已有题与记录）。 */
function mergeSeedIfBehind() {
  if (process.env.QUIZY_SKIP_SEED === '1') return;

  const seedPaths = resolveSeedPaths();
  if (!seedPaths.length) return;

  const seedQuestions = loadSeedQuestions();
  if (!seedQuestions.length) return;

  const dbCount = db.prepare('SELECT COUNT(*) AS cnt FROM questions').get().cnt;
  if (dbCount >= seedQuestions.length) return;

  const existing = new Set(
    db.prepare('SELECT subject, grade, content FROM questions').all()
      .map((r) => `${r.subject}\x1f${r.grade}\x1f${r.content}`)
  );

  const insert = db.prepare(`
    INSERT INTO questions (subject, grade, type, content, options, answer, image_path)
    VALUES (@subject, @grade, @type, @content, @options, @answer, @image_path)
  `);

  const insertMissing = db.transaction((qs) => {
    let added = 0;
    for (const q of qs) {
      const key = `${q.subject}\x1f${q.grade}\x1f${q.content}`;
      if (existing.has(key)) continue;
      insert.run({
        subject: q.subject,
        grade: q.grade,
        type: q.type,
        content: q.content,
        options: q.options ? JSON.stringify(q.options) : null,
        answer: q.answer,
        image_path: q.image_path || null
      });
      existing.add(key);
      added++;
    }
    return added;
  });

  const added = insertMissing(seedQuestions);
  if (added > 0 && process.env.NODE_ENV === 'development') {
    console.log(`[Quizy] merged ${added} questions from seed (${dbCount} → ${dbCount + added})`);
  }
}

function getRandomQuestion(subject, grade, excludeIds = [], types = null) {
  const typeList = Array.isArray(types) && types.length
    ? types
    : ['choice', 'judge', 'fill', 'image'];
  const typePh = typeList.map(() => '?').join(',');
  const excludePh = excludeIds.length > 0 ? excludeIds.map(() => '?').join(',') : null;

  let sql = `SELECT * FROM questions WHERE subject = ? AND grade = ? AND type IN (${typePh})`;
  const params = [subject, grade, ...typeList];
  if (excludePh) {
    sql += ` AND id NOT IN (${excludePh})`;
    params.push(...excludeIds);
  }
  sql += ' ORDER BY RANDOM() LIMIT 1';

  const row = db.prepare(sql).get(...params);
  if (!row) return null;

  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : null
  };
}

function getCorrectQuestionIds(subject, grade) {
  const rows = db.prepare(`
    SELECT DISTINCT r.question_id AS id
    FROM records r
    INNER JOIN questions q ON q.id = r.question_id
    WHERE r.is_correct = 1 AND q.subject = ? AND q.grade = ?
  `).all(subject, grade);
  return rows.map((r) => r.id);
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

function getQuestionAnswerStats() {
  const rows = db.prepare(`
    SELECT question_id,
           COUNT(*) AS total,
           SUM(is_correct) AS correct_count
    FROM records
    GROUP BY question_id
  `).all();
  const stats = {};
  for (const r of rows) {
    const total = r.total;
    const correctCount = r.correct_count;
    stats[r.question_id] = {
      total,
      correct_count: correctCount,
      rate: total ? Math.round((correctCount / total) * 100) : 0
    };
  }
  return stats;
}

module.exports = {
  initDb,
  closeDb,
  getDbPath,
  deleteDbFiles,
  resetDbAndReloadSeed,
  getRandomQuestion,
  getCorrectQuestionIds,
  addRecord,
  getRecords,
  getRecordDates,
  getAllQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionCount,
  getQuestionAnswerStats
};
