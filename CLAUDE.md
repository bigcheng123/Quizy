# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Quizy is a Windows Electron desktop app that turns boot-time into a forced quiz session for elementary-school children. The app launches fullscreen at login, locks the desktop, and only releases control after the child answers the configured number of Chinese (`chinese`) and Math (`math`) questions correctly. Parents reach an admin UI through a hidden 5-click trigger + password gate. All data is local (SQLite + electron-store); no network.

Primary product spec & open task list: `DEVELOPMENT_TASKS.md` (repo root). That doc is canonical — check section 2.2 for remaining gaps before assuming a file exists.

## Commands

```bash
npm install            # installs deps; postinstall runs electron-rebuild for better-sqlite3 (Electron ABI, not system Node)
npm run dev            # NODE_ENV=development; opens DevTools detached; disables auto-launch; reads seed from <repo>/data/seed.json
npm start              # runs electron . without dev flag (acts like production: auto-launch on, no DevTools, seed from resourcesPath)
npm run build          # electron-builder NSIS installer (Windows x64) → dist/
npm run build:dir      # unpacked build for quick smoke testing → dist/win-unpacked/
npm test               # node:test under ELECTRON_RUN_AS_NODE=1 so better-sqlite3 matches Electron; see test/*.test.js
npm run rebuild:electron   # re-run electron-rebuild if dev/test fails with NODE_MODULE_VERSION mismatch
```

There is **no linter or formatter** configured. The only scripted tests are `npm test` (see `test/`).

## Architecture

Three-tier Electron app, classic main/preload/renderer split with `contextIsolation: true` and `nodeIntegration: false`. Two BrowserWindows coexist:

- **Quiz window** (`src/renderer/quiz/`) — fullscreen, frameless, `closable: false`, `alwaysOnTop`. This is the lockscreen. Preload exposes `window.quizAPI`.
- **Admin window** (`src/renderer/admin/`) — 900×700, framed and resizable, **also `alwaysOnTop: true`** so the lock window can't visually bury it. Created only after the hidden-trigger + password flow succeeds. Preload exposes `window.adminAPI`.

Main process wiring (`src/main/main.js`):
1. `initStore(options?)` → electron-store with schema (default admin password `123456`, grade `3`, `unlockRequirements: {chinese: 5, math: 5}`, `adminSecretClickCount: 5`). Production calls `initStore()` with no args; tests may pass `{ cwd, name, projectVersion }`.
2. `initDb()` → opens `<userData>/quizy.db` (or `QUIZY_TEST_USERDATA` when set for tests), creates `questions` + `records` tables, runs `seedIfEmpty()` from `data/seed.json` (dev: repo root, prod: `process.resourcesPath/data/`, or `QUIZY_SEED_PATH`; skip seeding with `QUIZY_SKIP_SEED=1`). Use `closeDb()` only from tests or internal cleanup.
3. `setupAutoLaunch()` → `app.setLoginItemSettings({openAtLogin: true})` — **skipped in development** so you don't pollute your login items while iterating.
4. `registerIpcHandlers()` → all DB/config/IPC channels in `src/main/ipcHandlers.js`.
5. Registers no-op `globalShortcut` handlers for Alt+F4, Ctrl+W, Ctrl+R, F5, F11.

IPC channels are the only contract between renderers and main. To add new functionality from a renderer, you must touch **three files in sync**: the relevant preload (`quizPreload.js` / `adminPreload.js`) to expose the method, `ipcHandlers.js` to register the handler, and the underlying module in `src/main/`. There is no shared types file — channel names are strings.

## Hard constraints — do not break

These are load-bearing for the product working at all:

1. **Lockscreen integrity.** The quiz window's `close` and `blur` listeners (`src/main/main.js`, ~lines 35–49) prevent exit until `ipcMain.on('unlock-desktop')` fires. Do not relax `closable: false`, do not remove the blur→refocus handler, do not add a visible "exit" button on the quiz UI. Normal child exit is completing the quiz. **Note the `blur` exception:** when the Admin window is open, the blur handler intentionally does **not** refocus the quiz window — otherwise the lock would steal focus back from the admin UI and make it unreachable. Keep this branch if you refactor the handler. **Hidden emergency:** `Ctrl+Q` / `Cmd+Q` on the quiz page sends `emergency-quit` → `main.js` sets `isUnlocked` and `app.quit()` (for parents/dev; do not advertise to children).
2. **CSP is strict.** Both HTML files set `default-src 'self'` with `'unsafe-inline'` only for `style-src`. No CDN scripts, no inline `<script>`, no remote images. Static assets must be referenced with relative paths so they pass under `file://`.
3. **No frontend framework.** Renderers are vanilla HTML/CSS/JS by design — no build step. Don't introduce React/Vue/bundlers.
4. **Seed import is idempotent.** `seedIfEmpty()` checks `COUNT(*) FROM questions` and bails if non-empty. Don't add code paths that re-seed or wipe on upgrade.
5. **Password is plaintext in `electron-store`** (`%APPDATA%/Quizy/config.json`). This is an accepted tradeoff for the home-PC threat model. Don't log the password and don't hash it without coordinating with the user — the admin verify flow does a string compare.
6. **Subject and grade values are enums.** `subject ∈ {chinese, math}`, `grade ∈ {1..6}`, `type ∈ {choice, judge, fill, image}`. The DB has no constraints enforcing this — code does.

## Data locations

- DB: `app.getPath('userData')/quizy.db` (Windows: `%APPDATA%/Quizy/quizy.db`). WAL mode is **not** enabled but `.db-shm`/`.db-wal` are in `.gitignore` anyway.
- Config: `%APPDATA%/Quizy/config.json` (electron-store default).
- Seed: dev reads `<repo>/data/seed.json`; packaged build reads from `process.resourcesPath/data/seed.json` (wired via `extraResources` in `package.json`).

## Hidden admin entry flow

The right-bottom `#admin-trigger` element in the quiz UI accumulates clicks (5 by default, configurable via `adminSecretClickCount`) within a 3-second rolling window. On success it opens a password modal; correct password sends `open-admin-window` IPC, which spawns the admin BrowserWindow. The admin window stays open independently of the quiz window — closing it refocuses the quiz.
