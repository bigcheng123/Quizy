'use strict';

const SUBJECT_LABELS = { chinese: '语文', math: '数学' };
const TYPE_LABELS = { choice: '选择题', judge: '判断题', fill: '填空题', image: '看图题' };

let lastQuestions = [];

function showMsg(el, text, type) {
  if (!el) return;
  el.textContent = text || '';
  el.className = 'msg' + (type === 'error' ? ' error' : '');
}

function trunc(s, max) {
  if (s == null) return '';
  const t = String(s);
  return t.length > max ? t.slice(0, max) + '…' : t;
}

const TAB_ORDER = ['settings', 'questions', 'records'];

function showTab(name) {
  document.querySelectorAll('.tab-content').forEach((sec) => {
    sec.classList.toggle('active', sec.id === `tab-${name}`);
  });
  const navBtns = document.querySelectorAll('header nav .nav-btn');
  navBtns.forEach((btn, i) => {
    btn.classList.toggle('active', TAB_ORDER[i] === name);
  });
  if (name === 'questions') loadQuestions();
  if (name === 'records') {
    const prev = document.getElementById('records-date-select').value;
    refreshRecordDates().then(() => {
      const sel = document.getElementById('records-date-select');
      if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
      loadRecords();
    });
  }
}

async function loadSettingsForm() {
  const cfg = await window.adminAPI.getConfig();
  document.getElementById('grade-select').value = String(cfg.grade);
  const req = cfg.unlockRequirements || { chinese: 5, math: 5 };
  document.getElementById('req-chinese').value = req.chinese;
  document.getElementById('req-math').value = req.math;
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
}

async function refreshStats() {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';
  for (let g = 1; g <= 6; g++) {
    for (const sub of ['chinese', 'math']) {
      const cnt = await window.adminAPI.getQuestionCount(sub, g);
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML =
        `<div class="stat-num">${cnt}</div>` +
        `<div class="stat-label">${g}年级 · ${SUBJECT_LABELS[sub]}</div>`;
      grid.appendChild(card);
    }
  }
}

async function saveSettings() {
  const msgEl = document.getElementById('settings-msg');
  showMsg(msgEl, '', 'ok');

  const grade = parseInt(document.getElementById('grade-select').value, 10);
  const chinese = parseInt(document.getElementById('req-chinese').value, 10);
  const math = parseInt(document.getElementById('req-math').value, 10);
  const pwd = document.getElementById('new-password').value;
  const pwd2 = document.getElementById('confirm-password').value;

  if (![1, 2, 3, 4, 5, 6].includes(grade)) {
    showMsg(msgEl, '请选择有效年级。', 'error');
    return;
  }
  if (!Number.isInteger(chinese) || chinese < 1 || chinese > 20) {
    showMsg(msgEl, '语文每日题量须为 1–20 的整数。', 'error');
    return;
  }
  if (!Number.isInteger(math) || math < 1 || math > 20) {
    showMsg(msgEl, '数学每日题量须为 1–20 的整数。', 'error');
    return;
  }
  if (pwd || pwd2) {
    if (pwd !== pwd2) {
      showMsg(msgEl, '两次输入的新密码不一致。', 'error');
      return;
    }
  }

  try {
    await window.adminAPI.setConfig('grade', grade);
    await window.adminAPI.setConfig('unlockRequirements', { chinese, math });
    if (pwd) await window.adminAPI.setConfig('adminPassword', pwd);
    showMsg(msgEl, '保存成功。', 'ok');
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    setTimeout(() => {
      if (msgEl.textContent === '保存成功。') showMsg(msgEl, '', 'ok');
    }, 3000);
    await refreshStats();
    window.adminAPI.notifyQuizSessionReload();
  } catch (e) {
    showMsg(msgEl, '保存失败：' + (e.message || String(e)), 'error');
  }
}

function onTypeChange() {
  const t = document.getElementById('q-type').value;
  const optWrap = document.getElementById('options-form');
  if (t === 'choice' || t === 'image') {
    optWrap.style.display = 'block';
  } else {
    optWrap.style.display = 'none';
  }
}

function showAddForm() {
  document.getElementById('question-form').style.display = 'block';
  document.getElementById('edit-id').value = '';
  document.getElementById('form-title').textContent = '新增题目';
  document.getElementById('q-subject').value = 'chinese';
  document.getElementById('q-grade').value = '3';
  document.getElementById('q-type').value = 'choice';
  document.getElementById('q-content').value = '';
  document.getElementById('opt-a').value = '';
  document.getElementById('opt-b').value = '';
  document.getElementById('opt-c').value = '';
  document.getElementById('opt-d').value = '';
  document.getElementById('q-answer').value = '';
  showMsg(document.getElementById('form-msg'), '', 'ok');
  onTypeChange();
}

function hideForm() {
  document.getElementById('question-form').style.display = 'none';
}

async function loadQuestions() {
  const subject = document.getElementById('filter-subject').value || undefined;
  const gradeRaw = document.getElementById('filter-grade').value;
  const grade = gradeRaw ? parseInt(gradeRaw, 10) : undefined;
  const type = document.getElementById('filter-type').value || undefined;
  const filters = {};
  if (subject) filters.subject = subject;
  if (grade) filters.grade = grade;
  if (type) filters.type = type;

  lastQuestions = await window.adminAPI.getAllQuestions(filters);
  const list = document.getElementById('questions-list');
  if (!lastQuestions.length) {
    list.innerHTML = '<p class="empty-hint">暂无题目，可点击「新增题目」添加。</p>';
    return;
  }
  list.innerHTML = '';
  lastQuestions.forEach((row) => {
    const div = document.createElement('div');
    div.className = 'question-item';
    div.innerHTML =
      `<div class="q-meta">` +
      `<span class="tag">#${row.id}</span>` +
      `<span class="tag ${row.subject}">${SUBJECT_LABELS[row.subject] || row.subject}</span>` +
      `<span class="tag grade">${row.grade}年级</span>` +
      `<span class="tag">${TYPE_LABELS[row.type] || row.type}</span>` +
      `</div>` +
      `<div class="q-content">${escapeHtml(trunc(row.content, 50))}` +
      `<div class="q-answer">答案：${escapeHtml(trunc(row.answer, 20))}</div></div>` +
      `<div class="q-actions">` +
      `<button type="button" class="btn-edit" data-id="${row.id}">编辑</button>` +
      `<button type="button" class="btn-delete" data-id="${row.id}">删除</button>` +
      `</div>`;
    div.querySelector('.btn-edit').onclick = () => editQuestion(row.id);
    div.querySelector('.btn-delete').onclick = () => deleteQuestion(row.id);
    list.appendChild(div);
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function editQuestion(id) {
  const row = lastQuestions.find((r) => r.id === id);
  if (!row) return;
  document.getElementById('question-form').style.display = 'block';
  document.getElementById('edit-id').value = String(row.id);
  document.getElementById('form-title').textContent = '编辑题目';
  document.getElementById('q-subject').value = row.subject;
  document.getElementById('q-grade').value = String(row.grade);
  document.getElementById('q-type').value = row.type;
  document.getElementById('q-content').value = row.content;
  const opts = row.options || [];
  document.getElementById('opt-a').value = opts[0] || '';
  document.getElementById('opt-b').value = opts[1] || '';
  document.getElementById('opt-c').value = opts[2] || '';
  document.getElementById('opt-d').value = opts[3] || '';
  document.getElementById('q-answer').value = row.answer;
  showMsg(document.getElementById('form-msg'), '', 'ok');
  onTypeChange();
}

async function deleteQuestion(id) {
  if (!confirm('确定删除这道题目吗？')) return;
  try {
    await window.adminAPI.deleteQuestion(id);
    await loadQuestions();
    await refreshStats();
  } catch (e) {
    alert('删除失败：' + (e.message || String(e)));
  }
}

async function submitQuestion() {
  const msgEl = document.getElementById('form-msg');
  const type = document.getElementById('q-type').value;
  const content = document.getElementById('q-content').value.trim();
  const answer = document.getElementById('q-answer').value.trim();
  const subject = document.getElementById('q-subject').value;
  const grade = parseInt(document.getElementById('q-grade').value, 10);
  const editId = document.getElementById('edit-id').value.trim();

  if (!content) {
    showMsg(msgEl, '请填写题目内容。', 'error');
    return;
  }
  if (!answer) {
    showMsg(msgEl, '请填写正确答案。', 'error');
    return;
  }
  if (type === 'judge' && answer !== '正确' && answer !== '错误') {
    showMsg(msgEl, '判断题答案请填「正确」或「错误」。', 'error');
    return;
  }

  let options = null;
  if (type === 'choice' || type === 'image') {
    const a = document.getElementById('opt-a').value.trim();
    const b = document.getElementById('opt-b').value.trim();
    const c = document.getElementById('opt-c').value.trim();
    const d = document.getElementById('opt-d').value.trim();
    if (!a || !b || !c || !d) {
      showMsg(msgEl, '请填写完整的四个选项。', 'error');
      return;
    }
    options = [a, b, c, d];
    if (!options.includes(answer)) {
      showMsg(msgEl, '正确答案必须与某一选项文案完全一致。', 'error');
      return;
    }
  }

  const payload = {
    subject,
    grade,
    type,
    content,
    options,
    answer,
    image_path: null
  };

  try {
    if (editId) {
      await window.adminAPI.updateQuestion(parseInt(editId, 10), payload);
    } else {
      await window.adminAPI.addQuestion(payload);
    }
    showMsg(msgEl, '保存成功。', 'ok');
    hideForm();
    await loadQuestions();
    await refreshStats();
  } catch (e) {
    showMsg(msgEl, '保存失败：' + (e.message || String(e)), 'error');
  }
}

async function refreshRecordDates() {
  const sel = document.getElementById('records-date-select');
  const rows = await window.adminAPI.getRecordDates();
  const current = sel.value;
  sel.innerHTML = '<option value="">-- 选择日期 --</option>';
  rows.forEach((r) => {
    const d = r.date;
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    sel.appendChild(opt);
  });
  if (current && [...sel.options].some((o) => o.value === current)) sel.value = current;
}

function formatAnsweredAt(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

async function loadRecords() {
  const date = document.getElementById('records-date-select').value;
  const summaryEl = document.getElementById('records-summary');
  const listEl = document.getElementById('records-list');
  summaryEl.innerHTML = '';
  listEl.innerHTML = '';

  if (!date) {
    listEl.innerHTML = '<p class="empty-hint">请选择日期查看记录。</p>';
    return;
  }

  const rows = await window.adminAPI.getRecords(date);
  if (!rows.length) {
    summaryEl.innerHTML = '';
    listEl.innerHTML = '<p class="empty-hint">该日暂无答题记录。</p>';
    return;
  }

  let total = 0;
  let correct = 0;
  const bySub = { chinese: { t: 0, c: 0 }, math: { t: 0, c: 0 } };
  rows.forEach((r) => {
    total++;
    const ok = r.is_correct === 1 || r.is_correct === true;
    if (ok) correct++;
    const s = r.subject;
    if (bySub[s]) {
      bySub[s].t++;
      if (ok) bySub[s].c++;
    }
  });
  const rate = total ? Math.round((correct / total) * 100) : 0;

  summaryEl.className = 'records-summary';
  summaryEl.innerHTML =
    `<div class="summary-item"><div class="summary-num">${total}</div><div class="summary-label">总题数</div></div>` +
    `<div class="summary-item"><div class="summary-num">${correct}</div><div class="summary-label">答对</div></div>` +
    `<div class="summary-item"><div class="summary-num">${rate}%</div><div class="summary-label">正确率</div></div>` +
    `<div class="summary-item"><div class="summary-num">${bySub.chinese.c}/${bySub.chinese.t}</div><div class="summary-label">语文</div></div>` +
    `<div class="summary-item"><div class="summary-num">${bySub.math.c}/${bySub.math.t}</div><div class="summary-label">数学</div></div>`;

  listEl.innerHTML = '';
  rows.forEach((r) => {
    const ok = r.is_correct === 1 || r.is_correct === true;
    const div = document.createElement('div');
    div.className = 'record-item';
    div.innerHTML =
      `<span>${SUBJECT_LABELS[r.subject] || r.subject}</span>` +
      `<span>题目 #${r.question_id}</span>` +
      `<span class="result">${ok ? '✓' : '✗'}</span>` +
      `<span class="record-time">${formatAnsweredAt(r.answered_at)}</span>`;
    listEl.appendChild(div);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('header nav .nav-btn').forEach((btn) => {
    const name = btn.getAttribute('data-tab');
    if (name) btn.addEventListener('click', () => showTab(name));
  });

  document.getElementById('btn-save-settings').addEventListener('click', () => void saveSettings());

  document.getElementById('btn-filter-questions').addEventListener('click', () => void loadQuestions());
  document.getElementById('btn-add-question').addEventListener('click', () => showAddForm());
  document.getElementById('q-type').addEventListener('change', onTypeChange);
  document.getElementById('btn-submit-question').addEventListener('click', () => void submitQuestion());
  document.getElementById('btn-cancel-question-form').addEventListener('click', () => hideForm());
  document.getElementById('records-date-select').addEventListener('change', () => void loadRecords());

  await loadSettingsForm();
  await refreshStats();
  await refreshRecordDates();
});
