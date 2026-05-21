/**
 * Fetch 人教版2024 math unit lists from sxkhl.cn (public, no login).
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const GRADES = [
  ['1a', null],
  ['2a', 'rjn2a'],
  ['2b', 'rjn2b'],
  ['3a', 'rjn3a'],
  ['3b', 'rjn3b'],
  ['4a', 'rjn4a'],
  ['4b', 'rjn4b'],
  ['5a', 'rjn5a'],
  ['5b', 'rjn5b'],
  ['6a', 'rjn6a'],
  ['6b', 'rjn6b'],
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0 QuizyDocBot/1.0' } }, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve(d));
      })
      .on('error', reject);
  });
}

function parseUnits(html) {
  const units = [];
  const h3Re = /<h3[^>]*>([^<]+)<\/h3>/gi;
  const sumRe = /单元介绍[\s\S]*?<p[^>]*>([^<]+)</i;
  let m;
  while ((m = h3Re.exec(html)) !== null) {
    const title = m[1].trim();
    if (!/第\d+单元|^\*|复习|准备|数学游戏|校园|时间|连环|密铺|平衡|旅游|宝藏|亿|曹冲|数字编码|年、月|营养|绿色|体育|水/.test(title)) continue;
    units.push({ title, summary: '' });
  }
  return units;
}

(async () => {
  const out = {};
  for (const [key, slug] of GRADES) {
    if (!slug) {
      out[key] = { note: 'no sxkhl page' };
      continue;
    }
    const url = `https://sxkhl.cn/grade/${slug}`;
    const html = await fetch(url);
    out[key] = { url, units: parseUnits(html) };
    console.log(key, out[key].units.length);
    await new Promise((r) => setTimeout(r, 300));
  }
  const outPath = path.join(__dirname, '../docs/_sxkhl_math_units.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('wrote', outPath);
})();
