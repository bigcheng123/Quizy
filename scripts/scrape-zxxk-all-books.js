const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const IDS = [];
for (const base of [6600, 7000, 7360, 7700, 7780, 8000, 8200, 8400]) {
  for (let i = 0; i < 30; i++) IDS.push(`b${base + i}`);
}

function parseUnits(text) {
  const units = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!/^[一二三四五六七八九十☆★\*]\s/.test(t)) continue;
    if (/^(开学|周测|阶段|期中|期末|苏教|北师大)/.test(t)) continue;
    if (/课件|同步练习|口算题卡|动画|人教版$|上册$|下册$/.test(t)) continue;
    if (t.length > 45) continue;
    if (!units.includes(t)) units.push(t);
  }
  return units;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const found = {};

  for (const id of IDS) {
    const url = `https://sx.zxxk.com/p/books-${id}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(800);
      const text = await page.locator('body').innerText();
      if (!text.includes('人教版') || text.includes('苏教版')) continue;
      const m = text.match(/(一年级|二年级|三年级|四年级|五年级|六年级)(上册|下册)/);
      if (!m) continue;
      const label = m[0];
      const units = parseUnits(text);
      if (units.length < 4) continue;
      const key = `${label}@${id}`;
      if (!found[label] || units.length > found[label].units.length) {
        found[label] = { id, url, units };
        console.log('OK', label, id, units.length);
      }
    } catch (_) {}
  }

  fs.writeFileSync(
    path.join(__dirname, '../docs/_zxxk_all_books.json'),
    JSON.stringify(found, null, 2),
    'utf8'
  );
  console.log('done', Object.keys(found));
  await browser.close();
})();
