'use strict';

/**
 * Patch grade-1 exam benchmark rows in data/seed-grade-1-{chinese|math}.json
 * Usage: node scripts/patch-exam-seed-grade1.js [chinese|math|all]
 */

const fs = require('fs');
const path = require('path');
const { byTopic: mathTopics } = require('./exam-benchmarks-grade1-unit4.js');
const { byTopic: chineseTopics } = require('./exam-benchmarks-grade1-chinese-unit4.js');

const DATA = path.join(__dirname, '../data');
const mode = (process.argv[2] || 'all').toLowerCase();

function plain(s) {
  return String(s)
    .replace(/\[\[img:[^\]]+\]\]/g, '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\s+/g, '')
    .replace(/□/g, '（）')
    .replace(/○/g, '')
    .replace(/−/g, '-')
    .replace(/–/g, '-');
}

function signature(content) {
  const p = plain(content);
  const m = p.match(/[\u4e00-\u9fff\d+\-=（）()]+/g);
  return (m || []).join('').slice(0, 40);
}

function patchSubject(seed, benchmarks, subject) {
  let patched = 0;
  for (const row of seed) {
    if (row.subject !== subject || row.grade !== 1) continue;
    const sig = signature(row.content);
    if (!sig) continue;
    const hit = benchmarks.find((b) => {
      if (b.subject !== row.subject || b.grade !== row.grade || b.type !== row.type) return false;
      if (String(b.answer).replace(/−/g, '-') !== String(row.answer).replace(/−/g, '-')) return false;
      const bs = signature(b.content);
      return bs.includes(sig.slice(0, 12)) || sig.includes(bs.slice(0, 12));
    });
    if (!hit) continue;
    if (row.content === hit.content && row.image_path === hit.image_path) continue;
    row.content = hit.content;
    row.image_path = hit.image_path;
    if (hit.options) row.options = hit.options;
    if (hit.answer) row.answer = hit.answer;
    patched++;
  }
  return patched;
}

/** Rows whose answer/options changed vs older seed — match by plain-text prefix. */
function patchByPrefix(seed, benchmarks, subject) {
  let patched = 0;
  for (const row of seed) {
    if (row.subject !== subject || row.grade !== 1) continue;
    if (row.content.includes('[[img:')) continue;
    const rowPlain = plain(row.content);
    if (rowPlain.length < 10) continue;
    const hit = benchmarks.find((b) => {
      if (b.subject !== subject || b.grade !== 1) return false;
      const bp = plain(b.content);
      return bp.includes(rowPlain);
    });
    if (!hit || row.content === hit.content) continue;
    row.content = hit.content;
    row.image_path = hit.image_path;
    if (hit.options) row.options = hit.options;
    if (hit.answer) row.answer = hit.answer;
    if (hit.type) row.type = hit.type;
    patched++;
  }
  return patched;
}

function patchFile(subject, benchmarks, extraPrefixPatch) {
  const seedPath = path.join(DATA, `seed-grade-1-${subject}.json`);
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  let patched = patchSubject(seed, benchmarks, subject);
  if (extraPrefixPatch) patched += patchByPrefix(seed, benchmarks, subject);
  fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n', 'utf8');
  return patched;
}

let mathPatched = 0;
let chinesePatched = 0;

if (mode === 'all' || mode === 'math') {
  mathPatched = patchFile('math', Object.values(mathTopics).flat(), false);
}
if (mode === 'all' || mode === 'chinese') {
  chinesePatched = patchFile('chinese', Object.values(chineseTopics).flat(), true);
}

console.log('patched grade-1 math:', mathPatched);
console.log('patched grade-1 chinese:', chinesePatched);
