# Quizy 试卷 Markup 与数据格式

## Question JSON

```json
{
  "subject": "chinese | math",
  "grade": 1,
  "type": "choice | judge | fill | image",
  "content": "题干（可含 markup）",
  "options": ["①项", "②项"] ,
  "answer": "与 options 某一项完全一致，或 fill 的填空答案",
  "image_path": "../../assets/exam/<slug>/figure.png"
}
```

- `options`：仅 `choice` / `image`；判断/填空为 `null`
- `image_path`：主插图；若 `content` 已含 `[[img:...]]` 且路径相同，可只写在 content 内

## Content Markup

| 语法 | 渲染效果 |
|------|----------|
| `[[img:path]]` | 居中插图 |
| `[[img:path\|class:exam-figure exam-fig-right]]` | 右浮动插图 |
| `{{header:拼音\|一、填一填。\|12 分}}` | 蓝色大题标题 + 拼音 |
| `{{pinyin:tián\|填}}` | 汉字上方拼音 |
| `□` | 方框空（口算） |
| `○` | 圆框空（比大小） |
| `（ ）` | 括号填空下划线 |

路径相对于 `src/renderer/quiz/`。

## 试卷 UI（答题页）

- 白底 `#question-card.exam-paper`，蓝标题，楷体题干
- 选项前缀 **A. B. C. D.**（答题 UI 固定规则；题库里可保留 PDF 原文 `①…`，渲染时去掉圈号）
- 短选项横向排列（`.options-inline`）

## PDF 页图规格

`pdf-to-pages.py` 默认 2× 缩放 → 约 1190×1684 px（A4）。裁剪 bbox 使用该坐标系。

## 插图命名

`<topic>-<brief>.png`，例如：

- `decompose-37-40.png`
- `sticks-65minus8.png`
- `eggs-38plus6.png`

命名稳定后可写入 `scripts/extract-exam-figures.py` 的 `CROPS` 列表以便复用。
