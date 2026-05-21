# Quizy 开发任务文档

> 文档版本：v1.0
> 更新日期：2026-05-12
> 项目名称：Quizy — 儿童开机锁屏答题软件
> 目标平台：Windows（Electron + better-sqlite3）

---

## 一、项目概述

Quizy 是一款面向小学生的"开机即锁屏答题"软件。计算机开机后自动以全屏锁定方式启动，孩子必须完成当日规定数量的语文与数学题目，才能解锁桌面进入正常使用。家长（管理员）可通过右下角「设置」按钮 + 密码进入后台，配置年级、题量、密码并管理题库与查看答题记录。

### 1.1 核心价值
- **强约束**：开机即锁屏、屏蔽常见退出快捷键，孩子无法绕过。
- **趣味化**：星空背景、星星进度、即时反馈（音效 + 动画），鼓励学习。
- **可配置**：年级、每日答题量、密码、题库均由家长后台维护。
- **轻量本地化**：所有数据存储于本地 SQLite，无需网络。

### 1.2 技术栈
| 层 | 技术 |
| --- | --- |
| 桌面壳 | Electron 33 |
| 主进程 | Node.js（CommonJS） |
| 数据存储 | better-sqlite3 11.x + electron-store 8.x |
| 渲染层 | 原生 HTML/CSS/JS（不引入框架） |
| 打包 | electron-builder（NSIS 安装包） |

---

## 二、当前项目现状

### 2.1 已完成模块

| 模块 | 路径 | 状态 |
| --- | --- | --- |
| 主进程入口 | `src/main/main.js` | ✅ 已完成 |
| 数据库封装 | `src/main/db.js` | ✅ 已完成 |
| 配置存储 | `src/main/store.js` | ✅ 已完成 |
| 开机自启 | `src/main/autoLaunch.js` | ✅ 已完成 |
| IPC 处理器 | `src/main/ipcHandlers.js` | ✅ 已完成 |
| Quiz 预加载脚本 | `src/preload/quizPreload.js` | ✅ 已完成 |
| Admin 预加载脚本 | `src/preload/adminPreload.js` | ✅ 已完成 |
| 答题页 HTML | `src/renderer/quiz/index.html` | ✅ 已完成 |
| 答题页 JS | `src/renderer/quiz/quiz.js` | ✅ 已完成 |
| 答题页样式 | `src/renderer/quiz/quiz.css` | ✅ 已完成 |
| 管理后台 HTML | `src/renderer/admin/index.html` | ✅ 已完成 |
| 管理后台样式 | `src/renderer/admin/admin.css` | ✅ 已完成 |
| 管理后台逻辑 | `src/renderer/admin/admin.js` | ✅ 已完成 |
| 题库初始种子 | `data/seed.json` | ✅ 已完成 |
| 应用图标与音效 | `assets/icons/icon.ico`、`assets/sounds/*.mp3` | ✅ 已完成（T5） |
| `package.json` 与 `.gitignore` | 根目录 | ✅ 已完成 |
| README | `README.md` | ✅ 已完成 |
| 单元测试（T7） | `test/*.test.js`、`npm test` | ✅ 已完成（`db` + `store`；见 README §4.5） |

### 2.2 待完成模块（后续可选）

| 优先级 | 模块 | 路径 | 说明 |
| --- | --- | --- | --- |
| — | 扩展测试（可选） | `test/` | 如 IPC 联调、`admin.js` + jsdom 等 |

---

## 三、详细任务拆解

### 任务 T1：编写答题页样式 `quiz.css`（P0）

**目标**：将 `quiz/index.html` 中的元素渲染为儿童友好、沉浸式的全屏锁屏界面。

**关键设计要点**：
1. **全屏星空背景**：深蓝渐变（如 `#0f1d3a → #1a2d5c`），`.star` 节点用 `position:absolute` + `opacity` 关键帧动画营造闪烁。
2. **顶部进度条**：左右两栏，分别显示语文/数学进度。已答对的星 `⭐` 与未答对的空心 `☆` 区分显示。
3. **科目切换按钮**：标签页风格，`active` 态有底色高亮。
4. **题目卡片**：白色半透明卡片 + 圆角 + 柔和阴影。选项按钮悬停高亮，答对态 `.correct` 绿色，答错态 `.wrong` 红色 + `shake` 抖动关键帧。
5. **反馈层 `#feedback`**：居中大号 emoji，`feedbackAnim` 缩放 + 淡出动画（0.8s）。
6. **解锁遮罩 `#unlock-overlay`**：全屏渐变 + 大号庆祝文字。
7. **设置按钮 `#settings-btn`**：右下角可见「⚙️ 设置」按钮，单击弹出管理员密码框。
8. **管理员弹窗 `#admin-modal`**：半透明黑色遮罩 + 居中弹窗。
9. **响应式**：以 1080P 为基准，确保在 1366×768、4K 显示器均能合理显示（使用 `vw/vh` + `rem`）。

**验收标准**：
- 全屏无边框、无滚动条；
- 切换科目、选中选项、答错抖动、答对加星、解锁遮罩均能正常呈现；
- 所有动画 60 FPS 不卡顿；
- 不引入外部字体、图片，符合 CSP `default-src 'self'`。

---

### 任务 T2：实现管理后台逻辑 `admin.js`（P0）

**目标**：实现 `admin/index.html` 三个 Tab 的完整交互逻辑。

**模块清单**：

#### 2.1 基础设置 Tab
- 启动时调用 `adminAPI.getConfig()` 回填年级、每日题量、（密码字段留空）。
- `saveSettings()`：
  - 校验题量为 1–20 的整数；
  - 若密码字段非空，校验两次密码一致；
  - 分别 `setConfig('grade', ...)`、`setConfig('unlockRequirements', {...})`、`setConfig('adminPassword', ...)`；
  - 成功后在 `#settings-msg` 显示绿色提示，3 秒后清除。
- 当前题库统计 `#stats-grid`：6 个年级 × 2 个科目 = 12 个小卡片，分别调用 `getQuestionCount(subject, grade)`。

#### 2.2 题库管理 Tab
- `loadQuestions()`：读取筛选条件 → `getAllQuestions({subject, grade, type})` → 渲染列表。
- 列表项展示：编号、科目、年级、类型、题干（截断 50 字）、答案（截断 20 字）、编辑/删除按钮。
- `showAddForm()` / `editQuestion(id)`：填充表单，切换 `form-title`。
- `onTypeChange()`：
  - `choice` / `image`：显示 4 个选项输入框；
  - `judge`：隐藏选项框，提示答案填 "正确" / "错误"；
  - `fill`：隐藏选项框。
- `submitQuestion()`：
  - 必填项校验（题干、答案；选择题校验 4 个选项）；
  - 区分新增 / 编辑：`addQuestion(q)` / `updateQuestion(id, q)`；
  - 成功后清表单、刷新列表。
- `deleteQuestion(id)`：`confirm()` 二次确认后调用。

#### 2.3 答题记录 Tab
- 初始化时调用 `getRecordDates()` 填充日期下拉框。
- 切换日期后 `getRecords(date)` → 渲染：
  - 顶部 summary：总题数、正确数、正确率、按科目分组；
  - 列表：时间、科目、题目 ID、对/错。
- 题目 ID 关联展开可选（P2）。

#### 2.4 公共
- `showTab(name)`：切换显示 / `.active`。
- 全局 `msg` 工具函数：在指定元素显示成功/错误消息。

**验收标准**：
- 三个 Tab 切换流畅；
- 增、删、改、查题目均可生效（重启 quiz 端可见新题）；
- 密码修改后下次进入后台需输入新密码；
- 题量、年级修改后 quiz 端进度条数量同步刷新（需重启 quiz 窗口或重新加载）。

---

### 任务 T3：编写管理后台样式 `admin.css`（P0）

**目标**：让管理后台呈现清爽、专业的桌面工具风格。

**关键点**：
1. 顶部 header：浅蓝渐变 + 应用名 + 三个 Tab 按钮（`.nav-btn.active` 高亮）。
2. 表单行 `.form-row`：水平排列；`.form-group`：纵向 label + input；输入框统一 36px 高度、6px 圆角、灰边。
3. 按钮：`.btn-primary`（蓝）/ `.btn-success`（绿）/ `.btn-cancel`（灰）/ `.btn-danger`（红），统一悬停加深。
4. 题库列表：响应式表格或卡片网格；超长内容 `text-overflow: ellipsis`。
5. 统计卡片 `.stats-grid`：CSS Grid `repeat(auto-fill, minmax(140px, 1fr))`。
6. 消息提示 `.msg.success` 绿、`.msg.error` 红。

**验收标准**：
- 后台窗口 900×700 默认尺寸下排版美观，不溢出滚动条；
- 拉伸窗口至 1400×900 仍保持合理布局。

---

### 任务 T4：编写初始题库种子 `data/seed.json`（P0）

**目标**：首次启动时自动导入约 60–120 道示例题，让安装后即可使用。

**JSON 结构**（每个元素对应 `db.js` 中 `insert` 的字段）：
```json
{
  "subject": "chinese",      // chinese | math
  "grade": 3,                // 1–6
  "type": "choice",          // choice | judge | fill | image
  "content": "下列词语中没有错别字的一项是？",
  "options": ["再接再厉", "再接再励", "再节再厉", "在接在厉"],
  "answer": "再接再厉",
  "image_path": null         // type=image 时填本地相对路径或 file://，否则 null
}
```

**内容覆盖建议**：
- 语文（grade 1–6）：拼音、字词、成语、近反义词、句式判断、阅读理解小段；
- 数学（grade 1–6）：口算、应用题、几何识图、单位换算、判断题；
- 每个 `(subject, grade)` 至少 6 题，4 种类型至少各覆盖 1 次。

**验收标准**：
- 首次启动 quiz 窗口能立即抽到题目（数据库非空）；
- 同一道题不会在同一答题轮次内重复出现（已由 `excludeIds` 保证）。

---

### 任务 T5：补充资源文件（P1）

#### 5.1 应用图标
- 路径：`assets/icons/icon.ico`
- 要求：256×256（多分辨率 `ico`），主色与项目风格一致（如星空蓝 + 铅笔/星星图案）。
- 缺图时可用占位 ICO，后续再替换。

#### 5.2 反馈音效
- 路径：`assets/sounds/correct.mp3` / `wrong.mp3`
- 时长 < 1s、音量适中、儿童友好（如清脆铃声、温和提示音）。
- `quiz.js` 第 213 行已通过相对路径 `../../assets/sounds/...` 引用，注意 CSP `media-src 'self' file:` 已放行。

**验收标准**：
- `npm run build` 打包后 `assets/` 被打入安装包；
- 答题时听到对应音效。

---

### 任务 T6：编写 README（P2）

**目标**：覆盖以下章节：
1. 项目简介与截图
2. 功能列表
3. 系统要求（Windows 10+，64 位）
4. 开发环境准备（Node 18+、`npm install`、`npm run dev`）
5. 打包指南（`npm run build`，产物位置 `dist/`）
6. 默认管理员密码与设置入口操作方式
7. 常见问题（如无法解锁、密码遗忘的恢复方式）
8. 目录结构说明

---

### 任务 T7：基础测试（P2）

**目标**：为关键路径添加最小回归脚本（可选采用 Node 内置 `node:test` 或 `vitest`，避免引入额外 Electron 测试框架）。

**测试用例建议**：
- `db.test.js`：建库、插入、随机抽题排重、记录写入。
- `store.test.js`：默认值、读写、schema 校验。
- 渲染层逻辑（如 `submitQuestion` 表单校验）可用 jsdom 模拟。

---

## 四、关键约束与注意事项

1. **CSP 严格**：HTML 头部已锁定 `default-src 'self'`，新增样式/脚本/图片均需走本地路径，不得引入 CDN。
2. **不引入前端框架**：保持 vanilla JS，构建产物小且无构建步骤。
3. **不破坏锁屏行为**：
   - 不要在 quiz 渲染层添加可关闭主窗口的入口；
   - 修改 `main.js` 时务必保留 `close` 与 `blur` 监听；
   - 全局快捷键拦截清单（`Alt+F4` 等）只可增不可减。
4. **密码与配置存储**：电脑同一用户下 `electron-store` 文件位于 `%APPDATA%/Quizy/config.json`，密码以明文存储（学龄家庭场景下可接受），不要在日志中输出密码。
5. **路径兼容**：
   - 主进程使用 `path.join(__dirname, ...)` 与 `app.getPath('userData')`；
   - 渲染层引用静态资源使用相对路径（不要写绝对路径，会被 CSP 阻断）。
6. **种子导入幂等**：仅在题库为空时执行，`db.js` 已实现；不要重复触发。

---

## 五、里程碑与排期建议

| 阶段 | 任务 | 预估工时 |
| --- | --- | --- |
| M1 — 可运行 | T1（quiz.css） + T2（admin.js） + T3（admin.css） + T4（seed.json） | 1–2 天 |
| M2 — 资源完善 | T5（图标 / 音效） | 0.5 天 |
| M3 — 交付准备 | T6（README） + 手工冒烟测试 + 打包验证 | 0.5 天 |
| M4 — 加固（可选） | T7（自动化测试） | 1 天 |

---

## 六、验收清单（Definition of Done）

在认为整体开发完成前，需逐项勾选：

- [ ] `npm install` 一次性安装成功，无原生模块编译失败。
- [ ] `npm run dev` 启动后，全屏 quiz 窗口出现星空背景与题目卡片。
- [ ] 完成 5+5 题后出现"解锁成功"动画，桌面恢复可用。
- [ ] 点击右下角「设置」→ 出现密码弹窗 → 输入默认密码 `123456` → 进入管理后台。
- [ ] 后台修改年级、题量、密码后保存；下次启动 quiz 端立刻生效。
- [ ] 题库增/删/改/查全部正常，答题记录按日期可查。
- [ ] 关闭 quiz 窗口（X、Alt+F4）失败、Ctrl+R/F5/F11 无效。
- [ ] `npm run build` 生成 NSIS 安装包，安装到干净虚拟机后开机自启。
- [ ] 全程无 console 报错（仅允许 DevTools 中关于 audio 自动播放策略的告警）。

---

## 七、下一步行动

按 **T1 → T4 → T3 → T2** 顺序推进开发：
1. 先把 `quiz.css` 写好，保证已有的 `quiz.js` 在浏览器中能跑通基本视觉；
2. 再补 `seed.json`，让数据库有数据；
3. 完成 `admin.css` 静态样式 → 然后写 `admin.js` 业务逻辑；
4. 资源、README、测试在功能稳定后补全。

> 开发过程中如有需求或方案调整，请同步更新本文档并标注修订日期。
