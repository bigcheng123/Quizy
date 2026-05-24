---
name: pdf-exam-to-quizy
description: >-
  Converts elementary-school PDF exam papers into Quizy seed questions with 1:1
  fidelity (verbatim text, original diagrams, no edits). Use when the user provides
  a PDF试卷, asks to import/replicate exam questions into Quizy, or mentions
  pdf-exam-to-quizy.
---

# PDF 试卷 → Quizy 题目（1:1 复刻）

将 PDF 格式试卷**原样**转为 Quizy 题库 JSON。**禁止**改写题干、选项、答案或分值说明。

## 硬性规则

1. **1比1 转换，不要有任何改动**：题干、选项、答案、标点、序号、拼音必须与 PDF 一致。
2. **图形必须保留**：示意图、表格、小棒图、插图等从 PDF 裁剪为 PNG，写入 `assets/exam/<slug>/`。
3. **禁止** CDN、远程图片；路径使用相对 renderer 的 `../../assets/exam/...`。
4. 题型映射：`choice` | `judge` | `fill` | `image`（带图选择题仍用 `choice` 或 `image`）。
5. 完成后运行 `node scripts/patch-exam-seed-grade1.js` 或写入对应 `data/seed-grade-N-{chinese|math}.json`，并提醒用户删库重导或依赖 merge。

## 工作流

```
Task Progress:
- [ ] Step 1: PDF → 高清页图
- [ ] Step 2: 逐页 OCR + 布局分析（含插图区域）
- [ ] Step 3: 裁剪插图到 assets/exam/
- [ ] Step 4: 组装 seed JSON（含 markup）
- [ ] Step 5: 校验 1:1 对照 PDF
```

### Step 1 — PDF 转页图

```bash
python .cursor/skills/pdf-exam-to-quizy/scripts/pdf-to-pages.py "exam/Grade 1/math/试卷.pdf" "exam/Grade 1/math/_pages"
```

依赖：`pip install pymupdf pillow`（项目环境通常已具备）。

### Step 2 — 逐题提取（扫描版 PDF）

PDF 无文字层时：

1. 阅读 `_pages/page*.png`，按大题/小题编号切分。
2. 记录**原文**到 `exam/_extract/<slug>.md`（仅作对照，不进入题库）。
3. 标注每题：`type`、`answer`（若 PDF 无答案则标注 `[答案待填]` 并询问用户，**不得猜测**）。
4. 标注插图 bbox，供 Step 3 裁剪。

有文字层时可用 `pdfplumber` 辅助，但仍需目视核对页图，防止漏字/乱序。

### Step 3 — 裁剪插图

编辑 `scripts/extract-exam-figures.py` 中的 `CROPS` 列表（page, name, box），然后：

```bash
python scripts/extract-exam-figures.py
```

输出：`assets/exam/<slug>/*.png`

### Step 4 — 写入 Quizy 种子

每题一条 JSON（见 [reference.md](reference.md)）：

```json
{
  "subject": "math",
  "grade": 1,
  "type": "fill",
  "content": "{{header:tián yi tián|一、填一填。|12 分}}\n1. 37 + 40 = □\n[[img:../../assets/exam/grade1-math-unit4/decompose-37-40.png|alt:37+40分解图]]",
  "options": null,
  "answer": "77",
  "image_path": "../../assets/exam/grade1-math-unit4/decompose-37-40.png"
}
```

- 题干内嵌图：`[[img:路径|alt:说明|class:exam-figure exam-fig-right]]`
- 拼音标题：`{{header:拼音|中文标题|分值}}`
- 行内拼音：`{{pinyin:tián|填}}`
- 空白符号：保留 `□`、`○`、`（ ）` 原文

批量更新一年级数学第四单元基准题：`scripts/exam-benchmarks-grade1-unit4.js`，再：

```bash
node scripts/patch-exam-seed-grade1.js
```

### Step 5 — 1:1 校验清单

- [ ] 题号顺序与 PDF 一致
- [ ] 每题汉字、数字、符号与 PDF 逐字对照
- [ ] 答题 UI 选项为 A. B. C. D.（seed 可保留 PDF 圈号，由 `stripOptionMarker` 去重显示）
- [ ] 插图数量、位置与 PDF 对应
- [ ] `npm test` 通过
- [ ] 开发模式抽题可见试卷白底 UI + 插图

Also supports **语文** 第四单元素养评价卷：

```bash
python scripts/extract-exam-figures-chinese.py
node scripts/patch-exam-seed-grade1.js chinese
```

Assets: `assets/exam/grade1-chinese-unit4/` · Benchmarks: `scripts/exam-benchmarks-grade1-chinese-unit4.js`

## 项目内参考

| 资源 | 说明 |
|------|------|
| `exam/Grade 1/chinese/_pages/` | 语文第四单元素养评价卷页图 |
| `assets/exam/grade1-chinese-unit4/` | 语文单元插图 |
| `scripts/exam-benchmarks-grade1-chinese-unit4.js` | 语文已复刻题目模板 |
| `scripts/extract-exam-figures-chinese.py` | 语文插图裁剪 |
| `exam/Grade 1/math/_pages/` | 数学第四单元测评页图 |
| `scripts/exam-benchmarks-grade1-unit4.js` | 已复刻题目模板 |
| `src/renderer/quiz/exam-render.js` | 题干 markup 渲染 |
| [reference.md](reference.md) | markup 与 UI 对照 |

## 反模式

- 把「篮子里有 38 个鸡蛋」改写成「看图列式：38+6」
- 省略 PDF 上的拼音、分值、大题标题
- 用 AI 重新绘制插图代替 PDF 原图
- 合并两道题为一道「简化版」
