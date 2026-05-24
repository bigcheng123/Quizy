'use strict';

let config = null;
let currentSubject = 'chinese';
let currentQuestion = null;
let sessionWrongIds = { chinese: [], math: [] };
let correctCount = { chinese: 0, math: 0 };
let requirements = { chinese: 5, math: 5 };
let enabledSubjects = ['chinese', 'math'];
let grade = 3;
let isAnswering = false;
let unlockExitRequested = false;
const UNLOCK_BTN_DEFAULT = '结束锁屏，进入桌面';

const SUBJECT_LABELS = { chinese: '语文', math: '数学' };
const TYPE_LABELS = { choice: '选择题', judge: '判断题', fill: '填空题', image: '看图题' };
const EXAM_BANNERS = {
  chinese: { tag: '语文 一年级下册 RJ', title: '第四单元素养评价卷', meta: '时间：60 分钟　分值：100 分' },
  math: { tag: '一年级数学下（R）附录Ⅲ', title: '第四单元学业质量测评', meta: '时间：60 分钟　满分：100 分' }
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function init() {
  generateStars();
  config = await window.quizAPI.getConfig();
  applyConfig(config);
  renderProgress();
  await loadQuestion();
  setupFillControls();
  setupUnlockDone();
  setupAdminEntry();
  window.quizAPI.onQuizSessionReset(() => {
    resetQuizSession();
  });
}

function applyConfig(cfg) {
  config = cfg;
  const req = cfg.unlockRequirements || {};
  requirements = {
    chinese: typeof req.chinese === 'number' ? req.chinese : 5,
    math: typeof req.math === 'number' ? req.math : 5
  };
  grade = cfg.grade;
  enabledSubjects = Array.isArray(cfg.subjects) && cfg.subjects.length
    ? cfg.subjects.filter((s) => s === 'chinese' || s === 'math')
    : ['chinese', 'math'];
  if (!enabledSubjects.length) enabledSubjects = ['chinese'];
  applySubjectVisibility();
}

function applySubjectVisibility() {
  for (const subj of ['chinese', 'math']) {
    const on = enabledSubjects.includes(subj);
    const prog = document.querySelector(`.progress-subject .subject-label.${subj}`);
    if (prog && prog.parentElement) prog.parentElement.style.display = on ? '' : 'none';
    const tab = document.getElementById(`tab-${subj}`);
    if (tab) tab.style.display = on ? '' : 'none';
  }
  if (!enabledSubjects.includes(currentSubject)) {
    currentSubject = enabledSubjects[0];
  }
  document.getElementById('tab-chinese').classList.toggle('active', currentSubject === 'chinese');
  document.getElementById('tab-math').classList.toggle('active', currentSubject === 'math');
}

function allSubjectsComplete() {
  return enabledSubjects.every((s) => correctCount[s] >= requirements[s]);
}

async function resetQuizSession() {
  sessionWrongIds = { chinese: [], math: [] };
  correctCount = { chinese: 0, math: 0 };
  isAnswering = false;
  const cfg = await window.quizAPI.getConfig();
  applyConfig(cfg);

  document.getElementById('unlock-overlay').style.display = 'none';
  unlockExitRequested = false;
  const unlockBtn = document.getElementById('unlock-done-btn');
  if (unlockBtn) {
    unlockBtn.disabled = false;
    unlockBtn.textContent = UNLOCK_BTN_DEFAULT;
  }
  document.body.classList.remove('admin-modal-open');
  document.getElementById('admin-modal').style.display = 'none';

  currentSubject = enabledSubjects[0] || 'chinese';
  applySubjectVisibility();

  renderProgress();
  await loadQuestion();
}

function setupFillControls() {
  const btn = document.getElementById('fill-submit-btn');
  const input = document.getElementById('fill-input');
  btn.addEventListener('click', () => submitFill());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitFill();
    }
  });
}

function generateStars() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 3 + 1;
    s.style.cssText = `
      width:${size}px; height:${size}px;
      top:${Math.random()*100}%;
      left:${Math.random()*100}%;
      animation-delay:${Math.random()*3}s;
      animation-duration:${1.5 + Math.random()*2}s;
    `;
    container.appendChild(s);
  }
}

function renderProgress() {
  for (const subj of enabledSubjects) {
    const req = requirements[subj];
    const cnt = correctCount[subj];
    const starsRow = document.getElementById(`stars-${subj}`);
    starsRow.innerHTML = '';
    for (let i = 0; i < req; i++) {
      const span = document.createElement('span');
      span.className = 'star-icon' + (i < cnt ? ' earned' : '');
      span.textContent = i < cnt ? '⭐' : '☆';
      starsRow.appendChild(span);
    }
    document.getElementById(`text-${subj}`).textContent = `${cnt}/${req}`;
  }
}

function switchSubject(subj) {
  if (isAnswering) return;
  if (!enabledSubjects.includes(subj)) return;
  currentSubject = subj;
  document.getElementById('tab-chinese').classList.toggle('active', subj === 'chinese');
  document.getElementById('tab-math').classList.toggle('active', subj === 'math');
  loadQuestion();
}

async function loadQuestion() {
  isAnswering = false;
  const excludeIds = sessionWrongIds[currentSubject];
  const q = await window.quizAPI.getQuestion(currentSubject, grade, excludeIds);
  if (!q) {
    document.getElementById('question-content').innerHTML =
      escapeHtml('该年级本科目暂无可用题目。请在设置中调整年级或题型，或到管理后台补充题库；也可取消「答对不再出现」后重试。');
    document.getElementById('options-area').innerHTML = '';
    document.getElementById('fill-area').style.display = 'none';
    return;
  }
  currentQuestion = q;
  renderQuestion(q);
}

function updateExamBanner(subject) {
  const banner = EXAM_BANNERS[subject] || EXAM_BANNERS.math;
  document.getElementById('exam-subject-tag').textContent = banner.tag;
  document.getElementById('exam-paper-title').textContent = banner.title;
  document.getElementById('exam-paper-meta').textContent = banner.meta;
}

function renderQuestion(q) {
  updateExamBanner(q.subject);
  document.getElementById('q-grade-label').textContent = `${q.grade}年级`;
  document.getElementById('q-type-label').textContent = TYPE_LABELS[q.type] || q.type;

  const contentEl = document.getElementById('question-content');
  contentEl.innerHTML = ExamRender.render(q.content);

  const imgWrap = document.getElementById('question-image-wrap');
  const imgEl = document.getElementById('question-image');
  if (q.image_path && !q.content.includes('[[img:')) {
    imgEl.src = q.image_path;
    imgWrap.style.display = 'block';
  } else {
    imgWrap.style.display = 'none';
    imgEl.removeAttribute('src');
  }

  const optionsArea = document.getElementById('options-area');
  const fillArea = document.getElementById('fill-area');
  optionsArea.innerHTML = '';
  optionsArea.className = '';
  fillArea.style.display = 'none';

  if (q.type === 'choice' || q.type === 'image') {
    const opts = q.options || [];
    const inline = opts.every((o) => ExamRender.stripOptionMarker(o).length <= 12) && opts.length <= 5;
    if (inline) optionsArea.classList.add('options-inline');
    opts.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      const text = ExamRender.stripOptionMarker(opt);
      btn.innerHTML = `<span class="opt-num">${ExamRender.optionLabel(i)}</span>${escapeHtml(text)}`;
      btn.onclick = () => handleAnswer(opt, btn);
      optionsArea.appendChild(btn);
    });
  } else if (q.type === 'judge') {
    ['✓ 正确', '✗ 错误'].forEach((label, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn judge-btn';
      btn.textContent = label;
      const val = i === 0 ? '正确' : '错误';
      btn.onclick = () => handleAnswer(val, btn);
      optionsArea.appendChild(btn);
    });
  } else if (q.type === 'fill') {
    fillArea.style.display = 'flex';
    const input = document.getElementById('fill-input');
    input.value = '';
    input.focus();
  }
}

function submitFill() {
  const input = document.getElementById('fill-input');
  const val = input.value.trim();
  if (!val) return;
  handleAnswer(val, null);
}

async function handleAnswer(answer, btnEl) {
  if (isAnswering) return;
  isAnswering = true;

  const correct = answer.trim() === currentQuestion.answer.trim();
  if (!correct) {
    if (!sessionWrongIds[currentSubject].includes(currentQuestion.id)) {
      sessionWrongIds[currentSubject].push(currentQuestion.id);
    }
  }
  await window.quizAPI.submitAnswer(currentSubject, currentQuestion.id, correct);

  if (correct) {
    if (btnEl) btnEl.classList.add('correct');
    correctCount[currentSubject]++;
    renderProgress();
    showFeedback('⭐');
    playSound('correct');

    if (allSubjectsComplete()) {
      setTimeout(showUnlock, 800);
      return;
    }

    setTimeout(() => {
      autoSwitchSubjectIfDone();
      loadQuestion();
    }, 900);
  } else {
    if (btnEl) {
      btnEl.classList.add('wrong');
      document.getElementById('question-card').classList.add('shake');
      setTimeout(() => document.getElementById('question-card').classList.remove('shake'), 400);
    }
    highlightCorrectAnswer();
    showFeedback('💔');
    playSound('wrong');
    setTimeout(loadQuestion, 1200);
  }
}

function autoSwitchSubjectIfDone() {
  if (correctCount[currentSubject] >= requirements[currentSubject]) {
    const other = enabledSubjects.find((s) => s !== currentSubject && correctCount[s] < requirements[s]);
    if (other) switchSubjectSilent(other);
  }
}

function switchSubjectSilent(subj) {
  currentSubject = subj;
  document.getElementById('tab-chinese').classList.toggle('active', subj === 'chinese');
  document.getElementById('tab-math').classList.toggle('active', subj === 'math');
}

function highlightCorrectAnswer() {
  const optionBtns = document.querySelectorAll('.option-btn');
  const opts = currentQuestion.options || [];
  optionBtns.forEach((btn, i) => {
    const opt = opts[i];
    if (opt != null && String(opt).trim() === currentQuestion.answer.trim()) {
      btn.classList.add('correct');
    }
  });
  const fillInput = document.getElementById('fill-input');
  if (document.getElementById('fill-area').style.display !== 'none') {
    fillInput.value = currentQuestion.answer;
    fillInput.style.color = '#43e97b';
  }
}

function showFeedback(emoji) {
  const el = document.getElementById('feedback');
  el.textContent = emoji;
  el.style.display = 'block';
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'feedbackAnim 0.8s ease forwards';
  setTimeout(() => { el.style.display = 'none'; }, 800);
}

function playSound(type) {
  try {
    const audio = new Audio(`../../assets/sounds/${type}.mp3`);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (e) {}
}

function showUnlock() {
  unlockExitRequested = false;
  const unlockBtn = document.getElementById('unlock-done-btn');
  if (unlockBtn) {
    unlockBtn.disabled = false;
    unlockBtn.textContent = UNLOCK_BTN_DEFAULT;
  }
  document.getElementById('unlock-overlay').style.display = 'flex';
  if (unlockBtn) unlockBtn.focus();
}

function setupUnlockDone() {
  const btn = document.getElementById('unlock-done-btn');
  btn.addEventListener('click', () => {
    if (unlockExitRequested) return;
    unlockExitRequested = true;
    btn.disabled = true;
    btn.textContent = '正在退出…';
    window.quizAPI.unlockDesktop();
  });
}

function setupAdminEntry() {
  document.getElementById('settings-btn').addEventListener('click', () => showAdminModal());

  const adminModal = document.getElementById('admin-modal');
  adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) cancelAdmin();
  });

  document.getElementById('admin-btn-cancel').addEventListener('click', () => cancelAdmin());
  document.getElementById('admin-btn-confirm').addEventListener('click', () => confirmAdmin());

  document.getElementById('admin-pwd-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAdmin();
    if (e.key === 'Escape') cancelAdmin();
  });
}

function showAdminModal() {
  document.body.classList.add('admin-modal-open');
  document.getElementById('admin-modal').style.display = 'flex';
  document.getElementById('admin-pwd-input').value = '';
  document.getElementById('admin-pwd-error').style.display = 'none';
  document.getElementById('admin-pwd-input').focus();
}

function cancelAdmin() {
  document.body.classList.remove('admin-modal-open');
  document.getElementById('admin-modal').style.display = 'none';
}

async function confirmAdmin() {
  const pwd = document.getElementById('admin-pwd-input').value;
  const ok = await window.quizAPI.verifyPassword(pwd);
  if (ok) {
    document.body.classList.remove('admin-modal-open');
    document.getElementById('admin-modal').style.display = 'none';
    window.quizAPI.openAdmin();
  } else {
    document.getElementById('admin-pwd-error').style.display = 'block';
    document.getElementById('admin-pwd-input').value = '';
    document.getElementById('admin-pwd-input').focus();
  }
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'q') {
    window.quizAPI.emergencyQuit();
    e.preventDefault();
    return;
  }
  if (['F12', 'F5', 'F11'].includes(e.key)) e.preventDefault();
  if ((e.ctrlKey || e.metaKey) && ['r', 'w', 'q'].includes(e.key.toLowerCase())) e.preventDefault();
});
