'use strict';

/**
 * One-off: split data/seed-grade-{N}.json → seed-grade-{N}-{chinese|math}.json
 * Usage: node scripts/split-seed-by-subject.js [--remove-legacy]
 */

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '../data');
const removeLegacy = process.argv.includes('--remove-legacy');

for (let g = 1; g <= 6; g++) {
  const legacyPath = path.join(DATA, `seed-grade-${g}.json`);
  if (!fs.existsSync(legacyPath)) {
    console.log(`skip grade ${g}: no ${legacyPath}`);
    continue;
  }
  const qs = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
  const bySubject = { chinese: [], math: [] };
  for (const q of qs) {
    const subj = q.subject;
    if (!bySubject[subj]) bySubject[subj] = [];
    bySubject[subj].push(q);
  }
  for (const subj of ['chinese', 'math']) {
    const outPath = path.join(DATA, `seed-grade-${g}-${subj}.json`);
    const rows = bySubject[subj] || [];
    fs.writeFileSync(outPath, JSON.stringify(rows, null, 2) + '\n', 'utf8');
    console.log(`grade ${g} ${subj}: ${rows.length} → ${path.basename(outPath)}`);
  }
  if (removeLegacy) {
    fs.unlinkSync(legacyPath);
    console.log(`removed ${path.basename(legacyPath)}`);
  }
}
