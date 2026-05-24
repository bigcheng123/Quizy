'use strict';

/**
 * Parse knowleage_structure/guangdong-primary-knowledge-by-semester.md and emit data/seed-grade-{1-6}-{chinese|math}.json
 * with >= 10 questions per 语文/数学 knowledge point (▸ entries).
 *
 * Usage: node scripts/generate-seed-from-semester-md.js
 */

const fs = require('fs');
const path = require('path');
const { byTopic: EXAM_BENCHMARKS_MATH } = require('./exam-benchmarks-grade1-unit4.js');
const { byTopic: EXAM_BENCHMARKS_CHINESE } = require('./exam-benchmarks-grade1-chinese-unit4.js');

const MD_PATH = path.join(__dirname, '../knowleage_structure/guangdong-primary-knowledge-by-semester.md');
const OUT_DIR = path.join(__dirname, '../data');
const PER_POINT = 10;
const CMP_OPTS = ['>', '<', '='];

const GRADE_CN = ['', '一', '二', '三', '四', '五', '六'];
const TYPES_CYCLE = ['choice', 'choice', 'judge', 'judge', 'fill', 'fill', 'choice', 'judge', 'fill', 'image'];

function parseKnowledgePoints(md) {
  const lines = md.split(/\r?\n/);
  const gradeMap = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
  let grade = 0;
  let sem = '';
  let subj = '';
  const points = [];

  for (const line of lines) {
    const h = line.match(/^## (.+?)(上|下)册/);
    if (h) {
      grade = gradeMap[h[1][0]];
      sem = h[2] === '上' ? '上册' : '下册';
      continue;
    }
    if (line.startsWith('### 语文')) {
      subj = 'chinese';
      continue;
    }
    if (line.startsWith('### 数学')) {
      subj = 'math';
      continue;
    }
    if (line.startsWith('### ')) {
      subj = '';
      continue;
    }
    if (!subj || !grade || !line.includes('▸')) continue;

    for (const part of line.split('▸').map((s) => s.trim()).filter(Boolean)) {
      if (part.startsWith('|') || part.length < 2) continue;
      const topic = part.replace(/\s*\|\s*$/, '').replace(/\s*★\s*$/, '').replace(/\s+/g, ' ').trim();
      points.push({ grade, sem, subj, topic });
    }
  }
  return points;
}

function seedFrom(...parts) {
  let h = 0;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function rngFactory(seed) {
  let s = seed;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueOptions(correct, distractors, rng) {
  const set = new Set([correct, ...distractors]);
  const opts = shuffle(rng, [...set]).slice(0, 4);
  while (opts.length < 4) opts.push(String(Number(correct) + opts.length + 1));
  return opts.length >= 4 ? opts.slice(0, 4) : opts;
}

function q(subject, grade, type, content, answer, options = null) {
  return { subject, grade, type, content, options, answer, image_path: null };
}

/* ---------- Poem / fable banks (from doc titles) ---------- */
const POEM_BANK = {
  咏鹅: [
    { type: 'fill', stem: '《咏鹅》：鹅，鹅，鹅，曲项向天（ ）。', answer: '歌' },
    { type: 'judge', stem: '《咏鹅》的作者是唐代诗人骆宾王。', answer: '正确' },
    { type: 'choice', stem: '《咏鹅》描写的动物是？', answer: '鹅', options: ['鹅', '鸭', '鸡', '鹤'] },
    { type: 'fill', stem: '《咏鹅》：白毛浮绿水，红掌拨（ ）波。', answer: '清' },
  ],
  静夜思: [
    { type: 'fill', stem: '《静夜思》：床前明月光，疑是地上霜。举头望（ ），低头思故乡。', answer: '明月' },
    { type: 'fill', stem: '《静夜思》：床前明月光，疑是地上霜。举头望明月，低头（ ）故乡。', answer: '思' },
    { type: 'judge', stem: '《静夜思》表达了诗人思念家乡的感情。', answer: '正确' },
    { type: 'choice', stem: '「疑是地上霜」中「疑」的意思是？', answer: '好像', options: ['好像', '怀疑', '疑问', '疑惑'] },
  ],
  春晓: [
    { type: 'fill', stem: '《春晓》：春眠不觉晓，处处闻啼（ ）。', answer: '鸟' },
    { type: 'judge', stem: '《春晓》描写的是春天清晨的景象。', answer: '正确' },
  ],
  梅花: [
    { type: 'fill', stem: '《梅花》：墙角数枝梅，凌寒独自开。遥知不是雪，为有（ ）香来。', answer: '暗' },
    { type: 'judge', stem: '《梅花》赞美了梅花不畏严寒的品格。', answer: '正确' },
  ],
  望洞庭: [
    { type: 'choice', stem: '「湖光秋月两相和，潭面无风镜未磨」写的是？', answer: '洞庭湖夜景', options: ['洞庭湖夜景', '西湖春景', '长江日出', '黄河瀑布'] },
    { type: 'judge', stem: '《望洞庭》的作者是刘禹锡。', answer: '正确' },
  ],
  山行: [
    { type: 'fill', stem: '《山行》：停车坐爱枫林晚，霜叶红于（ ）花。', answer: '二' },
    { type: 'choice', stem: '《山行》描写的是哪个季节？', answer: '深秋', options: ['初春', '盛夏', '深秋', '隆冬'] },
  ],
  清明: [
    { type: 'fill', stem: '《清明》：清明时节雨纷纷，路上行人欲断魂。借问酒家何处有？牧童遥指（ ）花村。', answer: '杏' },
    { type: 'judge', stem: '《清明》与清明节习俗有关。', answer: '正确' },
  ],
  鹿柴: [
    { type: 'fill', stem: '《鹿柴》：空山不见人，但闻人语（ ）。', answer: '响' },
    { type: 'judge', stem: '《鹿柴》营造了一种幽静的山林意境。', answer: '正确' },
  ],
  暮江吟: [
    { type: 'choice', stem: '「一道残阳铺水中，半江瑟瑟半江红」描写的是？', answer: '傍晚江景', options: ['清晨江景', '傍晚江景', '雨中江景', '雪夜江景'] },
  ],
  题西林壁: [
    { type: 'fill', stem: '《题西林壁》：不识庐山真面目，只缘身在此（ ）中。', answer: '山' },
    { type: 'choice', stem: '《题西林壁》蕴含的道理最接近？', answer: '从不同角度看问题', options: ['要勤奋读书', '从不同角度看问题', '珍惜时间', '热爱劳动'] },
  ],
  示儿: [
    { type: 'fill', stem: '《示儿》：王师北定中原日，家祭无忘告（ ）翁。', answer: '乃' },
    { type: 'judge', stem: '《示儿》表达了诗人盼望国家统一的爱国情怀。', answer: '正确' },
  ],
};

const FABLE_BANK = {
  亡羊补牢: { moral: '出了问题及时补救还来得及', wrong: '丢了羊就不用再管羊圈' },
  画蛇添足: { moral: '多此一举反而坏事', wrong: '做事越多越好' },
  守株待兔: { moral: '不能心存侥幸，要靠努力', wrong: '只要等待就能不劳而获' },
  自相矛盾: { moral: '说话做事要前后一致', wrong: '可以同时夸耀矛和盾都无敌' },
};

/* ---------- Math helpers ---------- */
function benchmarkKey(point) {
  return `${point.grade}|${point.sem}|${point.topic}`;
}

function benchmarksForPoint(point, occurrenceIndex) {
  const key = benchmarkKey(point);
  const pool = point.subj === 'chinese' ? EXAM_BENCHMARKS_CHINESE[key] : EXAM_BENCHMARKS_MATH[key];
  if (!pool) return [];
  if (key === '1|下册|整理和复习') {
    if (point.subj !== 'math' || occurrenceIndex !== 3) return [];
    return pool;
  }
  return pool;
}

function tryMathExamUnit4(topic, idx, rng) {
  if (/口算加法/.test(topic)) {
    const kind = idx % 6;
    const a = randInt(rng, 10, 79);
    const b = randInt(rng, 1, Math.min(20, 99 - a));
    const s = a + b;
    if (kind === 0) {
      return q('math', 1, 'fill', `直接写出得数：${a} + ${b} = （ ）`, String(s));
    }
    if (kind === 1) {
      const x = randInt(rng, 20, 60);
      const y = randInt(rng, 3, 15);
      const sum = x + y;
      const wrong = sum + pick(rng, [-1, 1]);
      const ans = sum > wrong ? '>' : sum < wrong ? '<' : '=';
      return q('math', 1, 'choice', `在 ○ 里填 >、< 或 =：${x} + ${y} ○ ${wrong}`, ans, CMP_OPTS);
    }
    if (kind === 2) {
      const missing = randInt(rng, 10, 40);
      const addend = randInt(rng, 5, 30);
      return q('math', 1, 'fill', `□ + ${addend} = ${missing + addend}，□ = （ ）`, String(missing));
    }
    if (kind === 3) {
      const n1 = randInt(rng, 20, 50);
      const n2 = randInt(rng, 10, 30);
      return q('math', 1, 'fill', `一个数是 ${n1}，另一个数是 ${n2}，它们的和是（ ）。`, String(n1 + n2));
    }
    if (kind === 4) {
      const base = randInt(rng, 50, 90);
      const step = 5;
      return q('math', 1, 'fill', `从 ${base} 开始连续加 ${step}：${base}、${base + step}、${base + 2 * step}，下一个数是（ ）。`, String(base + 3 * step));
    }
    const tens = randInt(rng, 2, 7) * 10;
    const ones = randInt(rng, 1, 9);
    return q('math', 1, 'choice', `在 ${tens}+${ones}、${tens}+${ones * 10}、${tens + ones}+10 中，十位上的数能直接相加的是？`, `${tens}+${ones * 10}`, [
      `${tens}+${ones}`,
      `${tens}+${ones * 10}`,
      `${tens + ones}+10`,
      `${ones}+${tens}`,
    ]);
  }

  if (/口算减法/.test(topic)) {
    const kind = idx % 6;
    const a = randInt(rng, 20, 99);
    const b = randInt(rng, 1, Math.min(9, a - 10));
    const s = a - b;
    if (kind === 0) {
      return q('math', 1, 'fill', `直接写出得数：${a} − ${b} = （ ）`, String(s));
    }
    if (kind === 1) {
      const x = randInt(rng, 40, 90);
      const y = randInt(rng, 5, 20);
      const diff = x - y;
      const wrong = diff + pick(rng, [-1, 1]);
      const ans = diff > wrong ? '>' : diff < wrong ? '<' : '=';
      return q('math', 1, 'choice', `在 ○ 里填 >、< 或 =：${x} − ${y} ○ ${wrong}`, ans, CMP_OPTS);
    }
    if (kind === 2) {
      const total = randInt(rng, 30, 60);
      const part = randInt(rng, 5, total - 5);
      return q('math', 1, 'fill', `一共 ${total} 颗，左边 ${part} 颗，右边有（ ）颗。`, String(total - part));
    }
    if (kind === 3) {
      const n1 = randInt(rng, 30, 60);
      const n2 = randInt(rng, 10, 25);
      return q('math', 1, 'fill', `一个数是 ${n1}，另一个数是 ${n2}，它们的差是（ ）。`, String(n1 - n2));
    }
    if (kind === 4) {
      const start = randInt(rng, 50, 90);
      const step = 5;
      return q('math', 1, 'fill', `从 ${start} 开始连续减 ${step}：${start}、${start - step}、${start - 2 * step}，下一个数是（ ）。`, String(start - 3 * step));
    }
    const expr = `${a} − ${b}`;
    const alt = `${a - b + 1} − ${b}`;
    return q('math', 1, 'choice', `下列算式中，得数与 ${expr} 相同的是？`, expr, [expr, alt, `${a} + ${b}`, `${a} − ${b + 1}`]);
  }

  return null;
}

function gradeRange(grade) {
  const ranges = {
    1: { max: 20, mult: [1, 5] },
    2: { max: 100, mult: [2, 9] },
    3: { max: 1000, mult: [2, 9] },
    4: { max: 10000, mult: [2, 12] },
    5: { max: 100000, mult: [2, 12] },
    6: { max: 100000, mult: [2, 12] },
  };
  return ranges[grade] || ranges[3];
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function tryMathTopic(topic, grade, sem, idx, rng) {
  const t = topic;
  const pf = (stem, answer, options, qtype) =>
    q('math', grade, qtype || (options ? 'choice' : TYPES_CYCLE[idx % 10]), stem, answer, options);

  if (/拼音|英语|编码|身份证/.test(t)) return null;

  if (grade === 1 && sem === '下册' && /口算加法|口算减法/.test(t)) {
    const exam = tryMathExamUnit4(t, idx, rng);
    if (exam) return exam;
  }

  if (/^[0-9~～]+.*认识|数数|数的组成|数位|读写/.test(t) || /以内数的认识/.test(t)) {
    const n = randInt(rng, 1, Math.min(grade <= 1 ? 20 : grade <= 2 ? 100 : 9999, gradeRange(grade).max));
    if (idx % 3 === 0) {
      const wrong = n + randInt(rng, 1, 3);
      return pf(`数字 ${n} 读作下面哪一项是正确的？`, String(n), uniqueOptions(String(n), [String(wrong), String(n + 2), String(n - 1)], rng));
    }
    return pf(`在数位顺序中，${n} 的个位数字是？`, String(n % 10), uniqueOptions(String(n % 10), [String((n + 1) % 10), String((n + 2) % 10), '0'], rng));
  }

  if (/比大小|比较大小|数的大小/.test(t)) {
    const a = randInt(rng, 1, 50);
    let b = randInt(rng, 1, 50);
    while (b === a) b = randInt(rng, 1, 50);
    const ans = a > b ? '>' : a < b ? '<' : '=';
    return pf(`${a} 和 ${b} 比较，符号应选？`, ans, uniqueOptions(ans, ['>', '<', '=', '≠'], rng));
  }

  if (/加法|加、减法|口算加法|笔算加法|进位加法|整百|整千加/.test(t) && !/减法|乘|除/.test(t)) {
    const within100 = grade === 1 && sem === '下册' && /口算|笔算|100以内/.test(t);
    const max = within100 ? 89 : grade <= 1 ? 10 : grade <= 2 ? 50 : 200;
    const a = randInt(rng, within100 ? 10 : 0, max);
    const b = randInt(rng, within100 ? 1 : 0, within100 ? Math.min(20, 99 - a) : max);
    const s = a + b;
  if (within100 && idx % 3 === 0) {
      return pf(`直接写出得数：${a} + ${b} = （ ）`, String(s), null, 'fill');
    }
    return pf(`计算：${a} + ${b} = ？`, String(s), uniqueOptions(String(s), [String(s + 1), String(s - 1), String(s + 2)], rng));
  }

  if (/减法|退位减法|口算减法|笔算减法/.test(t) && !/加减混合|加、减法/.test(t)) {
    const within100 = grade === 1 && sem === '下册' && /口算|笔算|退位|十几减/.test(t);
    const max = within100 ? 99 : grade <= 1 ? 15 : 100;
    const a = randInt(rng, within100 ? 20 : 5, max);
    const b = randInt(rng, within100 ? 1 : 0, within100 ? Math.min(9, a - 10) : a);
    const s = a - b;
    if (within100 && idx % 3 === 0) {
      return pf(`直接写出得数：${a} − ${b} = （ ）`, String(s), null, 'fill');
    }
    return pf(`计算：${a} − ${b} = ？`, String(s), uniqueOptions(String(s), [String(s + 1), String(s + 2), String(a + b)], rng));
  }

  if (/乘法|乘法口诀|表内乘法|多位数乘|分数乘|小数乘/.test(t)) {
    const [lo, hi] = gradeRange(grade).mult;
    const a = randInt(rng, lo, hi);
    const b = randInt(rng, 2, Math.min(9, hi));
    const s = a * b;
    return pf(`计算：${a} × ${b} = ？`, String(s), uniqueOptions(String(s), [String(s + b), String(s - a), String(a + b)], rng));
  }

  if (/除法|平均分|表内除|有余数|除数是一位数|除数是两位数|小数除|分数除/.test(t)) {
    const b = randInt(rng, 2, 9);
    const qn = randInt(rng, 2, 9);
    const prod = b * qn;
    if (/有余数/.test(t)) {
      const div = randInt(rng, 10, 30);
      const d = randInt(rng, 3, 7);
      const quo = Math.floor(div / d);
      const rem = div % d;
      return pf(`${div} ÷ ${d} 的商是 ${quo}，余数是？`, String(rem), uniqueOptions(String(rem), [String(rem + 1), '0', String(d)], rng));
    }
    return pf(`计算：${prod} ÷ ${b} = ？`, String(qn), uniqueOptions(String(qn), [String(qn + 1), String(b), String(prod)], rng));
  }

  if (/分与合|组成/.test(t)) {
    const n = randInt(rng, 2, 9);
    const a = randInt(rng, 1, n - 1);
    return pf(`${n} 可以分成 ${a} 和几？`, String(n - a), uniqueOptions(String(n - a), [String(a), String(n), String(n + 1)], rng));
  }

  if (/第几|0的认识/.test(t)) {
    const arr = [2, 3, 4, 5, 6];
    const pos = randInt(rng, 1, arr.length);
    return pf(`数列 2、3、4、5、6 中，${arr[pos - 1]} 排第几？`, String(pos), uniqueOptions(String(pos), ['1', '2', '5'], rng));
  }

  if (/长方体|正方体|圆柱|球|长方形|正方形|三角形|圆|平行四边形|梯形/.test(t)) {
    const shapes = [];
    if (/长方体/.test(t)) shapes.push(['长方体', '6个面，相对的面相等']);
    if (/正方体/.test(t)) shapes.push(['正方体', '6个面都相等']);
    if (/圆柱/.test(t)) shapes.push(['圆柱', '上下两个底面是圆']);
    if (/球/.test(t)) shapes.push(['球', '可以向任意方向滚动']);
    if (/长方形/.test(t)) shapes.push(['长方形', '对边相等，四个角都是直角']);
    if (/正方形/.test(t)) shapes.push(['正方形', '四条边都相等']);
    if (/三角形/.test(t)) shapes.push(['三角形', '由三条线段围成']);
    if (/圆/.test(t)) shapes.push(['圆', '所有点到圆心距离相等']);
    if (/平行四边形/.test(t)) shapes.push(['平行四边形', '两组对边分别平行']);
    if (/梯形/.test(t)) shapes.push(['梯形', '只有一组对边平行']);
    const item = shapes.length ? pick(rng, shapes) : ['三角形', '由三条边围成'];
    return pf(`关于「${item[0]}」的说法，正确的是？`, item[1], uniqueOptions(item[1], ['没有角', '面都是三角形', '一定能滚动', '边数不固定'], rng));
  }

  if (/周长/.test(t)) {
    const a = randInt(rng, 3, 12);
    const b = randInt(rng, 2, 10);
    if (/正方形/.test(t) || (!/长方形/.test(t) && idx % 2)) {
      const p = 4 * a;
      return pf(`正方形边长 ${a} 厘米，周长是多少厘米？`, String(p), uniqueOptions(String(p), [String(a * 2), String(a + 4), String(4 + a)], rng));
    }
    const p = 2 * (a + b);
    return pf(`长方形长 ${a} 厘米、宽 ${b} 厘米，周长是多少厘米？`, String(p), uniqueOptions(String(p), [String(a * b), String(a + b), String(2 * a)], rng));
  }

  if (/面积/.test(t) && !/表面积|侧面积/.test(t)) {
    const a = randInt(rng, 3, 12);
    const b = randInt(rng, 2, 10);
    const area = a * b;
    return pf(`长方形长 ${a} cm、宽 ${b} cm，面积是多少 cm²？`, String(area), uniqueOptions(String(area), [String(a + b), String(2 * (a + b)), String(a * b + 1)], rng));
  }

  if (/分数|几分之/.test(t) && !/百分数/.test(t)) {
    const d = pick(rng, [2, 3, 4, 5, 6, 8]);
    const n1 = randInt(rng, 1, d - 1);
    const n2 = randInt(rng, 1, d - 1);
    if (/加减/.test(t) || /同分母/.test(t)) {
      const sum = n1 + n2;
      if (sum < d) return pf(`计算：${n1}/${d} + ${n2}/${d} = ？`, `${sum}/${d}`, uniqueOptions(`${sum}/${d}`, [`${n1}/${d}`, `${n2}/${d}`, `${sum + 1}/${d}`], rng));
    }
    return pf(`把一块蛋糕平均分成 ${d} 份，取其中 ${n1} 份，用分数表示是？`, `${n1}/${d}`, uniqueOptions(`${n1}/${d}`, [`${d}/${n1}`, `${n1}/${n1}`, `1/${d}`], rng));
  }

  if (/小数/.test(t) && !/百分数/.test(t)) {
    const a = randInt(rng, 1, 9);
    const b = randInt(rng, 0, 9);
    const x = parseFloat(`${a}.${b}`);
    const y = parseFloat(`${randInt(rng, 1, 9)}.${randInt(rng, 0, 9)}`);
    if (/加减/.test(t)) {
      const s = Math.round((x + y) * 10) / 10;
      return pf(`计算：${x} + ${y} = ？`, String(s), uniqueOptions(String(s), [String(s + 0.1), String(s - 0.1), String(x)], rng));
    }
    return pf(`下列小数中，最大的是？`, String(Math.max(x, y, 0.5)), uniqueOptions(String(Math.max(x, y, 0.5)), [String(Math.min(x, y)), '0.1', '0.01'], rng));
  }

  if (/百分数|折扣|税率|利率/.test(t)) {
    const base = pick(rng, [100, 200, 50]);
    const pct = pick(rng, [10, 20, 25, 50]);
    const val = (base * pct) / 100;
    return pf(`${base} 的 ${pct}% 是多少？`, String(val), uniqueOptions(String(val), [String(val + 10), String(base - val), String(pct)], rng));
  }

  if (/比例|比的意义|解比例|正比例|反比例/.test(t)) {
    const a = randInt(rng, 2, 8);
    const b = randInt(rng, 2, 8);
    const c = randInt(rng, 2, 6);
    const x = Math.round((b * c) / a);
    return pf(`解比例 ${a} : ${b} = ${c} : x，x = ？`, String(x), uniqueOptions(String(x), [String(x + 1), String(c), String(a + b)], rng));
  }

  if (/圆的|圆周长|圆面积|C=2πr|S=πr²/.test(t)) {
    const r = randInt(rng, 2, 10);
    if (/面积/.test(t)) {
      const ans = (3.14 * r * r).toFixed(2);
      return pf(`圆半径 ${r} 厘米（π 取 3.14），面积约多少平方厘米？`, ans, uniqueOptions(ans, [(3.14 * r * 2).toFixed(2), String(r * r), String(3.14 * r)], rng));
    }
    const ans = (2 * 3.14 * r).toFixed(2);
    return pf(`圆半径 ${r} 厘米（π 取 3.14），周长约多少厘米？`, ans, uniqueOptions(ans, [(3.14 * r * r).toFixed(2), String(r * 2), String(3.14 + r)], rng));
  }

  if (/负数|数轴/.test(t)) {
    return pf(`零上 3℃ 记作 +3℃，零下 5℃ 应记作？`, '−5℃', uniqueOptions('−5℃', ['+5℃', '−3℃', '5℃'], rng));
  }

  if (/混合运算|运算顺序|运算律|简便计算/.test(t)) {
    const a = randInt(rng, 2, 9);
    const b = randInt(rng, 2, 5);
    const c = randInt(rng, 1, 4);
    if (/简便|运算律/.test(t)) {
      const s = a * c + a * b;
      return pf(`简便计算：${a}×${c} + ${a}×${b} = ？`, String(s), uniqueOptions(String(s), [String(a + b + c), String(a * b * c), String(s + 1)], rng));
    }
    const s = a + b * c;
    return pf(`计算：${a} + ${b} × ${c} = ？`, String(s), uniqueOptions(String(s), [String((a + b) * c), String(a * b + c), String(a + b + c)], rng));
  }

  if (/认识人民币|元|角|分/.test(t)) {
    return pf(`1 元 = ？角`, '10', uniqueOptions('10', ['100', '1', '5'], rng));
  }

  if (/时分|24时|年月日|平年闰年/.test(t)) {
    if (/闰年/.test(t)) {
      return pf(`下面哪一年是闰年？`, '2024', uniqueOptions('2024', ['2023', '2022', '1900'], rng));
    }
    if (/24时/.test(t)) {
      return pf(`下午 3 时用 24 时计时法表示是？`, '15:00', uniqueOptions('15:00', ['3:00', '13:00', '12:00'], rng));
    }
    return pf(`1 小时 = ？分钟`, '60', uniqueOptions('60', ['100', '30', '24'], rng));
  }

  if (/厘米|米|毫米|分米|千米|1米=100厘米/.test(t)) {
    if (/1米=100厘米|1米=100/.test(t) || /米.*厘米/.test(t)) {
      return pf(`1 米 = ？厘米`, '100', uniqueOptions('100', ['10', '1000', '60'], rng));
    }
    const n = randInt(rng, 2, 9);
    return pf(`${n} 米 = ？厘米`, String(n * 100), uniqueOptions(String(n * 100), [String(n * 10), String(n), String(n + 100)], rng));
  }

  if (/因数|倍数|质数|合数|公因数|公倍数/.test(t)) {
    const n = pick(rng, [12, 18, 24, 30]);
    const factors = [];
    for (let i = 1; i <= n; i++) if (n % i === 0) factors.push(i);
    if (/质数/.test(t)) return pf(`下列哪个数是质数？`, '17', uniqueOptions('17', ['15', '21', '1'], rng));
    if (/公因数|公倍数/.test(t)) return pf(`12 和 18 的最大公因数是？`, '6', uniqueOptions('6', ['3', '12', '36'], rng));
    return pf(`${n} 的因数个数是？`, String(factors.length), uniqueOptions(String(factors.length), ['1', '2', String(factors.length + 1)], rng));
  }

  if (/平均数/.test(t)) {
    const nums = [randInt(rng, 2, 10), randInt(rng, 2, 10), randInt(rng, 2, 10)];
    const avg = (nums[0] + nums[1] + nums[2]) / 3;
    const ans = Number.isInteger(avg) ? String(avg) : avg.toFixed(1);
    return pf(`数据 ${nums.join('、')} 的平均数是？`, ans, uniqueOptions(ans, [String(nums[0]), String(nums[0] + nums[1]), String(nums[2] + 1)], rng));
  }

  if (/可能性|概率/.test(t)) {
    return pf(`袋中只有红球，任意摸一个，结果是？`, '一定是红球', uniqueOptions('一定是红球', ['可能是白球', '不可能是红球', '可能是红球也可能是蓝球'], rng));
  }

  if (/统计|复式统计|条形统计|折线统计|扇形统计/.test(t)) {
    const a = randInt(rng, 3, 8);
    const b = randInt(rng, 2, 7);
    return pf(`班里有 ${a} 人喜欢足球、${b} 人喜欢篮球，共多少人？`, String(a + b), uniqueOptions(String(a + b), [String(a - b), String(a * b), String(a)], rng));
  }

  if (/体积|表面积|侧面积|圆锥/.test(t)) {
    const a = randInt(rng, 2, 6);
    if (/圆锥/.test(t)) {
      const v = Math.round(((1 / 3) * 3.14 * a * a * (a + 2)) * 10) / 10;
      return pf(`圆锥底面半径 ${a} cm、高 ${a + 2} cm（π 取 3.14），体积约？立方厘米`, String(v), uniqueOptions(String(v), [String(a * a * (a + 2)), String(3.14 * a * a), String(v * 2)], rng));
    }
    const h = randInt(rng, 3, 10);
    const v = a * a * h;
    return pf(`正方体棱长 ${a} 厘米，体积是多少立方厘米？`, String(v), uniqueOptions(String(v), [String(6 * a * a), String(a * 4), String(v + a)], rng));
  }

  if (/方向|位置|数对/.test(t)) {
    return pf(`在方格图中，先向右走 3 格再向上走 2 格，用数对表示终点（列在前）是？`, '(5,3)', uniqueOptions('(5,3)', ['(3,2)', '(2,3)', '(3,5)'], rng));
  }

  if (/轴对称|平移|旋转/.test(t)) {
    return pf(`下列现象中，属于平移的是？`, '电梯上下移动', uniqueOptions('电梯上下移动', ['电风扇叶片转动', '钟表指针走动', '打开冰箱门'], rng));
  }

  if (/测量|估测|量角/.test(t)) {
    return pf(`直角是多少度？`, '90', uniqueOptions('90', ['180', '45', '60'], rng));
  }

  if (/解决问题|综合应用|整理和复习|应用提升/.test(t)) {
    const a = randInt(rng, 5, 20);
    const b = randInt(rng, 2, 9);
    return pf(`小明有 ${a} 个苹果，分给 ${b} 个小朋友每人同样多，每人几个？`, String(Math.floor(a / b)), uniqueOptions(String(Math.floor(a / b)), [String(a - b), String(a + b), String(b)], rng));
  }

  return null;
}

function tryChineseExamGrade1(topic, sem, idx, rng) {
  if (sem === '下册') return null;

  if (/拼音|韵母|声母|整体认读/.test(topic)) {
    const items = [
      { type: 'choice', stem: '下面读音完全正确的一项是？', answer: '②爸(bà) 妈(mā)', options: ['①大(dà) 地(dì)', '②爸(bà) 妈(mā)', '③我(wó) 你(nǐ)', '④书(shú) 包(bāo)'] },
      { type: 'choice', stem: '下列词语中，加点字读轻声的是？', answer: '②妈妈', options: ['①天地', '②妈妈', '③人口', '④手足'] },
      { type: 'fill', stem: '单韵母 a、o、e 属于（ ）韵母。', answer: '单' },
      { type: 'judge', stem: '声母和韵母相拼可以读出汉字的音。', answer: '正确' },
      { type: 'choice', stem: '整体认读音节的特点是？', answer: '直接认读，不用拼', options: ['直接认读，不用拼', '只能单独出现', '没有声调', '都是两个字母'] },
    ];
    const item = items[idx % items.length];
    return q('chinese', 1, item.type, item.stem, item.answer, item.options || null);
  }

  if (/象形字|笔画|天地人|金木水火土|口耳目|日月/.test(topic)) {
    const items = [
      { type: 'choice', stem: '「日」字属于什么造字方法？', answer: '象形', options: ['象形', '形声', '会意', '指事'] },
      { type: 'fill', stem: '「人」字第一笔是（ ）。', answer: '撇' },
      { type: 'choice', stem: '「口」字共有几画？', answer: '3', options: ['3', '2', '4', '5'] },
      { type: 'judge', stem: '「横、竖、撇、捺」是基本笔画。', answer: '正确' },
      { type: 'fill', stem: '《天地人》中，「天」的上面是（ ）。', answer: '一' },
      { type: 'choice', stem: '下面哪个字是「象形字」？', answer: '月', options: ['月', '明', '好', '林'] },
    ];
    const item = items[idx % items.length];
    return q('chinese', 1, item.type, item.stem, item.answer, item.options || null);
  }

  if (/朗读|秋天|小小的船|江南|四季|一片片|弯弯/.test(topic)) {
    const items = [
      { type: 'fill', stem: '照样子，写一写：一片片 → （ ）', answer: '一朵朵' },
      { type: 'fill', stem: '照样子，写一写：弯弯的 → （ ）的', answer: '长长' },
      { type: 'choice', stem: '「一片片」是什么结构的词语？', answer: 'AA的', options: ['AA的', 'ABB', 'AABB', 'ABAB'] },
      { type: 'judge', stem: '朗读《秋天》时要注意读出季节的特点。', answer: '正确' },
      { type: 'fill', stem: '《小小的船》中，「小小的」是（ ）式词语。', answer: 'AA' },
    ];
    const item = items[idx % items.length];
    return q('chinese', 1, item.type, item.stem, item.answer, item.options || null);
  }

  if (/自我介绍|看图说话/.test(topic)) {
    const items = [
      { type: 'image', stem: '看图写话：首先要做什么？', answer: '看清图意', options: ['看清图意', '随便乱写', '只写一个字', '抄课文'] },
      { type: 'fill', stem: '自我介绍时，首先要说出自己的（ ）。', answer: '名字' },
      { type: 'judge', stem: '看图说话时要先仔细观察图片。', answer: '正确' },
      { type: 'choice', stem: '看图写话时，应该？', answer: '展开想象写清楚', options: ['展开想象写清楚', '不用看图', '只写标点', '抄别人的'] },
    ];
    const item = items[idx % items.length];
    return q('chinese', 1, item.type, item.stem, item.answer, item.options || null);
  }

  return null;
}

function tryChineseTopic(topic, grade, sem, idx, rng) {
  if (grade === 1) {
    const examQ = tryChineseExamGrade1(topic, sem, idx, rng);
    if (examQ) return examQ;
  }

  const type = TYPES_CYCLE[idx % 10];
  const wrapQ = (stem, answer, options) =>
    q('chinese', grade, type, stem, answer, options);

  for (const key of Object.keys(POEM_BANK)) {
    if (topic.includes(key)) {
      const bank = POEM_BANK[key];
      const item = bank[idx % bank.length];
      return q('chinese', grade, item.type, item.stem, item.answer, item.options || null);
    }
  }

  for (const key of Object.keys(FABLE_BANK)) {
    if (topic.includes(key)) {
      const f = FABLE_BANK[key];
      if (idx % 2 === 0) {
        return wrapQ(`寓言「${key}」告诉我们的道理是？`, f.moral, uniqueOptions(f.moral, [f.wrong, '越慢越好', '不用思考'], rng));
      }
      return wrapQ(`寓言「${key}」的道理是：${f.moral}`, '正确', null);
    }
  }

  if (/拼音|韵母|声母|整体认读/.test(topic)) {
    const items = [
      { stem: '单韵母 a、o、e 属于？', answer: '单韵母', options: ['单韵母', '声母', '整体认读音节', '复韵母'] },
      { stem: '「整体认读音节」的特点是？', answer: '直接整体认读，不用拼', options: ['直接整体认读，不用拼', '只能和韵母拼', '都是两个字母', '没有声调'] },
      { stem: '声母「b」和韵母「a」相拼可读作？', answer: 'ba', options: ['ba', 'ab', 'pa', 'bo'] },
    ];
    const item = items[idx % items.length];
    return wrapQ(item.stem, item.answer, item.options);
  }

  if (/比喻|拟人|排比|反复/.test(topic)) {
    const items = [
      { stem: '「弯弯的月亮像小船」主要运用了哪种修辞？', answer: '比喻', options: ['比喻', '拟人', '夸张', '排比'] },
      { stem: '「花儿在笑」主要运用了哪种修辞？', answer: '拟人', options: ['拟人', '比喻', '排比', '设问'] },
      { stem: '「他跑得很快，像箭一样」运用的修辞是？', answer: '比喻', options: ['比喻', '拟人', '反问', '对偶'] },
    ];
    const item = items[idx % items.length];
    return wrapQ(item.stem, item.answer, item.options);
  }

  if (/标点|逗号|句号|问号/.test(topic)) {
    const items = [
      { stem: '「你会去哪里（ ）」句末应填？', answer: '？', options: null },
      { stem: '陈述一件事，句末一般用？', answer: '错误', options: null },
      { stem: '「今天天气真好（ ）」句末应填？', answer: '。', options: null },
    ];
    const item = items[idx % items.length];
    const qt = item.options === null && (item.answer === '正确' || item.answer === '错误') ? 'judge' : 'fill';
    return q('chinese', grade, qt, item.stem, item.answer, item.options);
  }

  if (/ABB|AABB|多音字|部首|偏旁|查字/.test(topic)) {
    const items = [
      { stem: '「高高兴兴」的词语结构是？', answer: 'AABB', options: ['AABB', 'ABB', 'ABAB', 'ABAC'] },
      { stem: '「重重」中「重」的读音是？', answer: 'chóng', options: ['chóng', 'zhòng', 'zhǒng', 'chòng'] },
      { stem: '查字典时，「部首查字法」应先查？', answer: '部首', options: ['部首', '笔画', '音序', '页码'] },
    ];
    const item = items[idx % items.length];
    return wrapQ(item.stem, item.answer, item.options);
  }

  if (/默读|朗读|预测|提问|中心句|说明方法|描写/.test(topic)) {
    const items = [
      { stem: '阅读时看到题目和插图先猜想内容，属于哪种阅读策略？', answer: '预测', options: ['预测', '抄写', '默背字典', '查部首'] },
      { stem: '边读边在头脑中想象画面，有助于？', answer: '理解内容', options: ['理解内容', '加快速度跳过', '不用思考', '只记生字'] },
      { stem: '说明文中「列数字」的作用是？', answer: '使说明更准确具体', options: ['使说明更准确具体', '增加悬念', '表达情感', '制造比喻'] },
    ];
    const item = items[idx % items.length];
    return wrapQ(item.stem, item.answer, item.options);
  }

  if (/习作|写话|缩写|读后感/.test(topic)) {
    const items = [
      { stem: '写人物外貌特点时，应抓住？', answer: '最突出的特征', options: ['最突出的特征', '所有细节一样多', '与人物无关的内容', '只写衣服品牌'] },
      { stem: '看图写话时，首先要？', answer: '看清图意', options: ['看清图意', '随便乱写', '只写标点', '抄课文'] },
    ];
    const item = items[idx % items.length];
    return wrapQ(item.stem, item.answer, item.options);
  }

  if (/《/.test(topic) && !(grade === 1 && sem === '下册')) {
    const title = (topic.match(/《([^》]+)》/) || [])[1] || topic.slice(0, 6);
    const pool = [
      { type: 'judge', stem: `课文《${title}》的学习重点包括理解内容、积累词语。`, answer: '正确' },
      { type: 'judge', stem: `朗读课文《${title}》时，应注意停顿和语气。`, answer: '正确' },
      { type: 'choice', stem: `《${title}》属于本学期哪类学习内容？`, answer: '课文阅读', options: ['课文阅读', '数学计算', '科学实验', '体育技能'] },
      { type: 'fill', stem: `我们学习的课文篇目包括《${title}》，篇名是《（ ）》`, answer: title },
      { type: 'choice', stem: `学好《${title}》时，较好的做法是？`, answer: '朗读并理解课文', options: ['朗读并理解课文', '只抄字不思考', '跳过不读', '不用积累词语'] },
      { type: 'judge', stem: `《${title}》的识字与朗读可以完全不复习。`, answer: '错误' },
      { type: 'fill', stem: `《${title}》这篇课文，我们应做到：读懂内容、（ ）好词`, answer: '积累' },
      { type: 'image', stem: `想象课本插图与《${title}》相关，最应进行的学习活动是？`, answer: '朗读与理解课文', options: ['朗读与理解课文', '只做算术题', '忽略课文', '不看书'] },
    ];
    const item = pool[idx % pool.length];
    return q('chinese', grade, item.type, item.stem, item.answer, item.options || null);
  }

  return null;
}

function fallbackQuestion(point, idx) {
  const { grade, sem, subj, topic } = point;
  const rng = rngFactory(seedFrom(subj, grade, sem, topic, idx));
  const type = TYPES_CYCLE[idx % 10];
  const tag = topic.length > 20 ? topic.slice(0, 20) + '…' : topic;

  if (subj === 'math') {
    const isSub = /减法|退位|口算减|笔算减/.test(topic);
    const a = randInt(rng, isSub ? 15 : 2, isSub ? 50 : 8 + grade * 2);
    const b = randInt(rng, 1, isSub ? Math.min(9, a - 1) : 6 + grade);
    const s = isSub ? a - b : a + b;
    const expr = isSub ? `${a} − ${b}` : `${a} + ${b}`;
    if (type === 'choice') {
      return q('math', grade, type, `计算：${expr} = ？`, String(s), uniqueOptions(String(s), [String(s + 1), String(s - 1), String(a * b)], rng));
    }
    if (type === 'judge') {
      const wrong = isSub ? s + 1 : s + 1;
      return q('math', grade, type, `${expr} = ${wrong}`, '错误', null);
    }
    if (type === 'fill') {
      return q('math', grade, type, `${expr} = （ ）`, String(s), null);
    }
    const rows = randInt(rng, 2, 4);
    const cols = randInt(rng, 2, 5);
    const total = rows * cols;
    return q('math', grade, 'image', `想象图中有 ${rows} 行 ${cols} 列圆点，共有多少个？`, String(total), uniqueOptions(String(total), [String(total + 1), String(total - 1), String(rows + cols)], rng));
  }

  const stems = {
    choice: [
      `学习「${tag}」时，下面哪项做法最合适？`,
      `与「${tag}」相关的学习要求是？`,
    ],
    judge: [
      `认真学好「${tag}」有助于提高语文素养。`,
      `「${tag}」可以完全不复习。`,
    ],
    fill: [`本学期知识点包含：（ ）`, `学好语文要关注：（ ）`],
    image: [`根据文字描述想象情境：与「${tag}」相关的学习活动是？`],
  };

  if (type === 'choice') {
    const stem = stems.choice[idx % 2];
    const ans = '认真阅读课文并积累词句';
    return q('chinese', grade, type, stem, ans, uniqueOptions(ans, ['不用朗读', '只抄字不思考', '跳过课文'], rng));
  }
  if (type === 'judge') {
    const ok = idx % 2 === 0;
    return q('chinese', grade, type, stems.judge[ok ? 0 : 1], ok ? '正确' : '错误', null);
  }
  if (type === 'fill') {
    const ans = idx % 2 === 0 ? '积累词句' : '认真阅读';
    return q('chinese', grade, type, stems.fill[idx % 2], ans, null);
  }
  return q('chinese', grade, 'image', stems.image[0], '朗读与理解课文', uniqueOptions('朗读与理解课文', ['完全不看课本', '只玩不看', '随便乱写'], rng));
}

function generateForPoint(point, occurrenceIndex) {
  const out = [];
  const seen = new Set();
  const benchPool = benchmarksForPoint(point, occurrenceIndex);

  for (let i = 0; i < PER_POINT; i++) {
    if (benchPool[i]) {
      const item = { ...benchPool[i] };
      const key = `${item.content}|${item.answer}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
        continue;
      }
    }

    const rng = rngFactory(seedFrom(point.subj, point.grade, point.sem, point.topic, i));
    let item = null;
    if (point.subj === 'math') item = tryMathTopic(point.topic, point.grade, point.sem, i, rng);
    else item = tryChineseTopic(point.topic, point.grade, point.sem, i, rng);
    if (!item) item = fallbackQuestion(point, i);

    const key = `${item.content}|${item.answer}`;
    if (seen.has(key)) {
      item = fallbackQuestion(point, i + 100);
    }
    seen.add(`${item.content}|${item.answer}`);
    out.push(item);
  }
  return out;
}

function main() {
  const md = fs.readFileSync(MD_PATH, 'utf-8');
  const points = parseKnowledgePoints(md);
  const byGradeSubject = new Map();
  const countByPoint = new Map();
  const benchOffsets = new Map();
  const topicOccurrence = new Map();

  for (const p of points) {
    const benchKey = `${p.subj}|${p.grade}|${p.sem}|${p.topic}`;
    const offset = benchOffsets.get(benchKey) || 0;
    const occurrence = topicOccurrence.get(benchKey) || 0;
    topicOccurrence.set(benchKey, occurrence + 1);
    const qs = generateForPoint(p, occurrence);
    benchOffsets.set(benchKey, offset + PER_POINT);

    const key = `${p.subj}|${p.grade}|${p.sem}|${p.topic}|${offset}`;
    countByPoint.set(key, qs.length);
    const bucket = `${p.grade}-${p.subj}`;
    if (!byGradeSubject.has(bucket)) byGradeSubject.set(bucket, []);
    byGradeSubject.get(bucket).push(...qs);
  }

  const min = Math.min(...countByPoint.values());
  const bad = [...countByPoint.entries()].filter(([, c]) => c < PER_POINT);
  if (bad.length) {
    console.error('Points with <10 questions:', bad.length);
    process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let total = 0;
  for (let g = 1; g <= 6; g++) {
    for (const subj of ['chinese', 'math']) {
      const qs = byGradeSubject.get(`${g}-${subj}`) || [];
      const outPath = path.join(OUT_DIR, `seed-grade-${g}-${subj}.json`);
      fs.writeFileSync(outPath, JSON.stringify(qs, null, 2) + '\n', 'utf-8');
      total += qs.length;
      console.log(`  grade ${g} ${subj}: ${qs.length} questions → ${outPath}`);
    }
    const legacyGrade = path.join(OUT_DIR, `seed-grade-${g}.json`);
    if (fs.existsSync(legacyGrade)) {
      fs.unlinkSync(legacyGrade);
      console.log(`  removed legacy ${legacyGrade}`);
    }
  }

  const legacy = path.join(OUT_DIR, 'seed.json');
  if (fs.existsSync(legacy)) {
    fs.unlinkSync(legacy);
    console.log(`  removed legacy ${legacy}`);
  }

  console.log(`Knowledge points: ${points.length}`);
  console.log(`Questions written: ${total} (min per point: ${min})`);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseKnowledgePoints,
  generateForPoint,
  benchmarksForPoint,
  main,
};
