'use strict';

/**
 * Import 考试例题 from knowleage_structure/grade-{N}-{chinese|math}.md
 * into data/seed-grade-{N}-{chinese|math}.json (merge, dedupe, exam wins).
 *
 * Usage:
 *   node scripts/import-knowledge-exam.js              # grades 1–6
 *   node scripts/import-knowledge-exam.js 2           # grade 2 only
 *   node scripts/import-knowledge-exam.js 2-4         # grades 2–4
 *   node scripts/import-knowledge-exam.js 2 chinese    # grade 2 语文 only
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const KS = path.join(ROOT, 'knowleage_structure');
const DATA = path.join(ROOT, 'data');

const TYPE_MAP = {
  选择题: 'choice',
  填空题: 'fill',
  判断题: 'judge',
};

function plainSig(s) {
  return String(s)
    .replace(/\[\[img:[^\]]+\]\]/g, '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/[🍎★○□（）()\s、，。！？；：""''「」\-\−–=+×÷<>]/g, '')
    .toLowerCase();
}

function dedupeKey(row) {
  return `${row.subject}|${row.type}|${plainSig(row.content)}|${plainSig(row.answer)}`;
}

function enhanceMathContent(text, isMath) {
  if (!isMath) return text;
  let t = text;
  t = t.replace(/（\s*）/g, '□');
  t = t.replace(/\(\s*\)/g, '□');
  t = t.replace(/－/g, '−');
  return t;
}

function enhanceChineseContent(text) {
  return text.replace(/_{2,}/g, '（ ）');
}

function enhanceMathAnswer(text, isMath) {
  if (!isMath) return text;
  return String(text).replace(/－/g, '−').trim();
}

function parseOptionsBlock(lines) {
  const joined = lines.join(' ');
  const parts = joined.split(/\s*[　\s]{2,}\s*/).filter(Boolean);
  const opts = [];
  for (const part of parts) {
    const m = part.match(/^([A-D])[.、．)\s]\s*(.+)$/);
    if (m) opts.push(m[2].trim());
  }
  if (opts.length >= 2) return opts;
  const single = joined.match(/(?:^|\s)([A-D])[.、．)\s]\s*([^A-D]+?)(?=\s+[A-D][.、．)\s]|$)/g);
  if (single) {
    for (const chunk of single) {
      const m = chunk.trim().match(/^([A-D])[.、．)\s]\s*(.+)$/);
      if (m) opts.push(m[2].trim());
    }
  }
  return opts.length >= 2 ? opts.slice(0, 4) : null;
}

function resolveChoiceAnswer(raw, options) {
  const a = raw.trim();
  if (/^[A-D]$/.test(a) && options) {
    const idx = a.charCodeAt(0) - 65;
    if (options[idx]) return options[idx];
  }
  if (options) {
    const hit = options.find((o) => o === a || o.replace(/\s/g, '') === a.replace(/\s/g, ''));
    if (hit) return hit;
  }
  return a;
}

function parseExamSection(md, subject, grade) {
  const marker = '## 考试例题';
  const start = md.indexOf(marker);
  if (start < 0) return [];
  const section = md.slice(start);
  const blocks = section.split(/\n(?=> \*\*)/);
  const out = [];
  const isMath = subject === 'math';

  for (const block of blocks) {
    if (!block.includes('<details>')) continue;
    const header = block.match(/^> \*\*([^*]+)\*\* · (选择题|填空题|判断题)：(.+?)(?:\n|$)/m);
    if (!header) continue;
    const qType = TYPE_MAP[header[2]];
    if (!qType) continue;
    let content = header[3].trim();
    const ansMatch = block.match(/<details><summary>答案<\/summary>([\s\S]*?)<\/details>/);
    if (!ansMatch) continue;
    let answer = ansMatch[1].trim();

    const bodyLines = block
      .split('\n')
      .map((l) => l.replace(/^>\s?/, '').trim())
      .filter((l) => l && !l.startsWith('<details') && !l.startsWith('**'));

    const optLines = bodyLines.filter((l) => /^[A-D][.、．)\s]/.test(l));
    let options = null;
    if (qType === 'choice') {
      options = parseOptionsBlock(optLines.length ? optLines : bodyLines);
      if (!options) {
        const optLine = bodyLines.find((l) => /\sA[.、．)\s]/.test(l) && /\sB[.、．)\s]/.test(l));
        if (optLine) options = parseOptionsBlock([optLine]);
      }
      answer = resolveChoiceAnswer(answer, options);
    }

    if (qType === 'judge') {
      if (answer === '对' || answer === '√') answer = '正确';
      if (answer === '错' || answer === '×') answer = '错误';
    }

    content = isMath ? enhanceMathContent(content, true) : enhanceChineseContent(content);
    answer = enhanceMathAnswer(answer, isMath);

    out.push({
      subject,
      grade,
      type: qType,
      content,
      options: qType === 'choice' ? options : null,
      answer,
      image_path: null,
    });
  }
  return out;
}

function mergeSeed(existing, imported, subject, grade) {
  const keys = new Set(imported.map(dedupeKey));
  const kept = existing.filter((row) => {
    if (row.subject !== subject || row.grade !== grade) return true;
    const k = dedupeKey(row);
    if (keys.has(k)) return false;
    const contentSig = plainSig(row.content);
    for (const ex of imported) {
      const exSig = plainSig(ex.content);
      if (contentSig.length >= 8 && exSig.length >= 8) {
        if (contentSig.includes(exSig.slice(0, 12)) || exSig.includes(contentSig.slice(0, 12))) {
          if (row.type === ex.type) return false;
        }
      }
    }
    return true;
  });
  const merged = [...imported, ...kept];
  const seen = new Set();
  const final = [];
  for (const row of merged) {
    const k = dedupeKey(row);
    if (seen.has(k)) continue;
    seen.add(k);
    final.push(row);
  }
  return final;
}

function runSubject(grade, subject) {
  const mdPath = path.join(KS, `grade-${grade}-${subject}.md`);
  const seedPath = path.join(DATA, `seed-grade-${grade}-${subject}.json`);
  if (!fs.existsSync(mdPath)) {
    console.warn(`  skip: no ${mdPath}`);
    return null;
  }
  if (!fs.existsSync(seedPath)) {
    console.warn(`  skip: no ${seedPath}`);
    return null;
  }
  const md = fs.readFileSync(mdPath, 'utf8');
  const existing = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const imported = parseExamSection(md, subject, grade);
  const badChoice = imported.filter((q) => q.type === 'choice' && (!q.options || q.options.length < 2));
  if (badChoice.length) {
    console.warn(
      `  grade ${grade} ${subject}: ${badChoice.length} choice missing options — ${badChoice[0].content.slice(0, 50)}…`
    );
  }
  const merged = mergeSeed(existing, imported, subject, grade);
  fs.writeFileSync(seedPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  const delta = merged.length - existing.length;
  console.log(
    `  grade ${grade} ${subject}: +${imported.length} exam → ${existing.length} → ${merged.length} (${delta >= 0 ? '+' : ''}${delta})`
  );
  return { grade, subject, imported: imported.length, before: existing.length, after: merged.length, badChoice: badChoice.length };
}

function parseGradeArg(arg) {
  if (!arg || arg === 'all') return [1, 2, 3, 4, 5, 6];
  if (/^\d+$/.test(arg)) return [Number(arg)];
  const m = arg.match(/^(\d+)-(\d+)$/);
  if (m) {
    const lo = Number(m[1]);
    const hi = Number(m[2]);
    const out = [];
    for (let g = lo; g <= hi; g++) out.push(g);
    return out;
  }
  throw new Error(`Invalid grade arg: ${arg}`);
}

function main() {
  const grades = parseGradeArg(process.argv[2]);
  const subjArg = (process.argv[3] || 'both').toLowerCase();
  const subjects = subjArg === 'both' ? ['chinese', 'math'] : [subjArg];

  console.log(`Import knowledge 考试例题 → seed (grades ${grades.join(', ')})\n`);
  const results = [];
  for (const g of grades) {
    console.log(`── Grade ${g} ──`);
    for (const s of subjects) {
      const r = runSubject(g, s);
      if (r) results.push(r);
    }
    console.log('');
  }

  const totalImported = results.reduce((n, r) => n + r.imported, 0);
  const totalBad = results.reduce((n, r) => n + r.badChoice, 0);
  console.log(`Done: ${results.length} files, ${totalImported} exam rows imported, ${totalBad} choice warnings.`);
  console.log('Reload DB: reload-seed.bat or delete %APPDATA%/Quizy/quizy.db');
  return results;
}

if (require.main === module) {
  main();
}

module.exports = { parseExamSection, mergeSeed, runSubject, parseGradeArg };
