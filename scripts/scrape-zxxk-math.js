/**
 * Scrape zxxk.com 人教版 新教材 小学数学 unit tree per semester.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const START = 'https://sx.zxxk.com/p/books-b7027';
const OUT = path.join(__dirname, '../docs/_zxxk_math_catalog.json');

function parseUnitsFromText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const units = [];
  const mainRe = /^[一二三四五六七八九十☆★\*]\s*.+/;
  const skip = /^(开学|周测|阶段|期中|期末|寒暑假|竞赛|小升初|知识点|试题|专项|课件|教案)/;

  for (const line of lines) {
    if (!mainRe.test(line) || skip.test(line)) continue;
    if (line.length > 60) continue;
    if (!units.includes(line)) units.push(line);
  }
  return units;
}

function parseLessonsFromText(text, unitTitle) {
  const idx = text.indexOf(unitTitle);
  if (idx < 0) return [];
  const chunk = text.slice(idx, idx + 800);
  const lessons = [];
  const re = /(?:^|\n)(\d+\.\d+[^\n]{0,40}|第\d+课时[^\n]{0,40}|十几减\d[^\n]{0,20}|数数[^\n]{0,20}|口算[^\n]{0,20})/g;
  let m;
  while ((m = re.exec(chunk)) !== null) {
    const s = m[1].trim();
    if (s.length > 3 && s.length < 50) lessons.push(s);
  }
  return [...new Set(lessons)].slice(0, 12);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN',
  });

  const catalog = {};

  try {
    await page.goto(START, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(5000);

    // Expand all tree nodes
    for (let round = 0; round < 5; round++) {
      const icons = page.locator('.el-tree-node__expand-icon:not(.is-leaf)');
      const n = await icons.count();
      for (let i = 0; i < n; i++) {
        try {
          await icons.nth(i).click({ timeout: 300 });
        } catch (_) {}
      }
      await page.waitForTimeout(800);
    }

    const semesters = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.el-tree-node__label, a').forEach((el) => {
        const t = (el.textContent || '').replace(/\s+/g, '').trim();
        if (/^(一年级|二年级|三年级|四年级|五年级|六年级)(上册|下册)$/.test(t)) {
          const a = el.closest('a') || el;
          out.push({ label: t, href: a.href || '' });
        }
      });
      const seen = new Set();
      return out.filter((x) => (seen.has(x.label) ? false : (seen.add(x.label), true)));
    });

    console.log('semesters:', semesters.map((s) => s.label).join(', '));

    for (const sem of semesters) {
      try {
        if (sem.href) await page.goto(sem.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
        else await page.getByText(sem.label, { exact: true }).first().click({ timeout: 8000 });
        await page.waitForTimeout(3000);

        const bodyText = await page.locator('body').innerText();
        const units = parseUnitsFromText(bodyText);
        const unitDetails = units.map((u) => ({
          title: u,
          lessons: parseLessonsFromText(bodyText, u),
        }));

        catalog[sem.label] = { url: page.url(), units: unitDetails };
        console.log(sem.label, units.length, units.join(' | '));
      } catch (e) {
        catalog[sem.label] = { error: e.message };
        console.warn(sem.label, e.message);
      }
    }

    fs.writeFileSync(
      OUT,
      JSON.stringify({ source: START, scrapedAt: new Date().toISOString(), catalog }, null, 2),
      'utf8'
    );
    console.log('wrote', OUT);
  } finally {
    await browser.close();
  }
})();
