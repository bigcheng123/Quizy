const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, '../docs/guangdong-primary-knowledge-by-semester.md');
const dataPath = path.join(__dirname, '../docs/_zxxk_math_knowledge.json');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let md = fs.readFileSync(mdPath, 'utf8');

const ZXXK = data.sourceUrl;

function mathBlock(semKey) {
  const sem = data.semesters[semKey];
  if (!sem) return '';
  const src = sem.zxxkUrl ? `\n> 学科网教材页：[${semKey}](${sem.zxxkUrl})` : '';
  const rows = sem.units
    .map((u) => {
      const pts = u.points.map((p) => `▸ ${p}`).join(' ');
      return `| **${u.title}** ★ | ${pts} |`;
    })
    .join('\n');
  return `### 数学（人教版·2024 新教材 · [学科网](${ZXXK})）${src}

| 单元 | 知识点 |
|------|--------|
${rows}

`;
}

const map = [
  ['## 一年级上册', '一年级上册'],
  ['## 一年级下册', '一年级下册'],
  ['## 二年级上册', '二年级上册'],
  ['## 二年级下册', '二年级下册'],
  ['## 三年级上册', '三年级上册'],
  ['## 三年级下册', '三年级下册'],
  ['## 四年级上册', '四年级上册'],
  ['## 四年级下册', '四年级下册'],
  ['## 五年级上册', '五年级上册'],
  ['## 五年级下册', '五年级下册'],
  ['## 六年级上册', '六年级上册'],
  ['## 六年级下册', '六年级下册'],
];

for (const [heading, key] of map) {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `(${esc}[\\s\\S]*?)### 数学[\\s\\S]*?(?=\\n### )`,
    'm'
  );
  if (!re.test(md)) {
    console.warn('no match', key);
    continue;
  }
  md = md.replace(re, `$1${mathBlock(key)}`);
  console.log('patched', key);
}

// Remove legacy math tables (no ** unit titles) left after 新教材 block
md = md.replace(
  /\n\n\| 单元 \| 知识点 ★ \|\n\|[-| ]+\|\n(?:\|[^*|\n]+\|\n)+/g,
  '\n\n'
);

// Fix broken link from earlier run
md = md.replace(
  /\[学科网\]\(https:\/\/sx\.zxxk\.com\/p\/books-b7027[^)]*\)/g,
  `[学科网](${ZXXK})`
);

const headerNote = `> **数学（人教版·2024 新教材）**：单元与知识点对齐 [学科网教材同步](${ZXXK})（广东站）；1—3 年级目录为站点抓取结果，4—6 年级与同版教材目录一致。详见 \`docs/_zxxk_math_knowledge.json\`。  
`;

if (!md.includes('学科网教材同步')) {
  md = md.replace(/> \*\*结构\*\*：每个年级分/, `${headerNote}> **结构**：每个年级分`);
}

md = md.replace(
  /## 修订说明\n\n([\s\S]*?)\n\n\*\*最后更新\*\*/,
  `## 修订说明

- 数学单元与知识点：2026-05 按 [学科网](${ZXXK}) 人教版（2024 新教材）目录更新；抓取脚本见 \`scripts/scrape-zxxk-math.js\`。
$1

**最后更新**`
);

fs.writeFileSync(mdPath, md, 'utf8');
console.log('updated', mdPath);
