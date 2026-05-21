const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://sx.zxxk.com/p/books-b7027', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4000);

  // Scroll tree panel
  await page.evaluate(() => {
    const el = document.querySelector('.el-tree, .tree-box, [class*="tree"]');
    if (el) el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(500);

  for (let r = 0; r < 10; r++) {
    const icons = page.locator('.el-tree-node__expand-icon:not(.is-leaf)');
    const n = await icons.count();
    for (let i = 0; i < n; i++) {
      try {
        await icons.nth(i).click({ timeout: 200 });
      } catch (_) {}
    }
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      document.querySelectorAll('.el-tree, [class*="tree"]').forEach((el) => {
        el.scrollTop = el.scrollHeight;
      });
    });
  }

  const links = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="books-b"]')].map((a) => ({
      text: a.textContent.replace(/\s+/g, '').trim(),
      href: a.href,
    }))
  );

  const semesters = links.filter((l) => /^(一年级|二年级|三年级|四年级|五年级|六年级)(上册|下册)$/.test(l.text));
  const seen = new Set();
  const unique = semesters.filter((l) => (seen.has(l.text) ? false : (seen.add(l.text), true)));

  console.log(JSON.stringify(unique, null, 2));
  fs.writeFileSync(path.join(__dirname, '../docs/_zxxk_semester_links.json'), JSON.stringify(unique, null, 2), 'utf8');
  await browser.close();
})();
