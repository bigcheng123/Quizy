const Store = require('electron-store');

const ALL_SUBJECTS = ['chinese', 'math'];
const ALL_QUESTION_TYPES = ['choice', 'judge', 'fill', 'image'];

const schema = {
  grade: { type: 'number', default: 3 },
  subjects: {
    type: 'array',
    default: ALL_SUBJECTS
  },
  questionTypes: {
    type: 'array',
    default: ALL_QUESTION_TYPES
  },
  excludeCorrectlyAnswered: { type: 'boolean', default: true },
  adminPassword: { type: 'string', default: '123456' },
  unlockRequirements: {
    type: 'object',
    default: { chinese: 5, math: 5 }
  },
  openAtLogin: { type: 'boolean', default: true }
};

let store;

function initStore(options = {}) {
  store = new Store({ ...options, schema });
}

function normalizeSubjects(list) {
  const raw = Array.isArray(list) ? list : ALL_SUBJECTS;
  const picked = raw.filter((s) => ALL_SUBJECTS.includes(s));
  return picked.length ? picked : ALL_SUBJECTS;
}

function normalizeQuestionTypes(list) {
  const raw = Array.isArray(list) ? list : ALL_QUESTION_TYPES;
  const picked = raw.filter((t) => ALL_QUESTION_TYPES.includes(t));
  return picked.length ? picked : ALL_QUESTION_TYPES;
}

function getConfig() {
  return {
    grade: store.get('grade'),
    subjects: normalizeSubjects(store.get('subjects')),
    questionTypes: normalizeQuestionTypes(store.get('questionTypes')),
    excludeCorrectlyAnswered: store.get('excludeCorrectlyAnswered') !== false,
    adminPassword: store.get('adminPassword'),
    unlockRequirements: store.get('unlockRequirements'),
    openAtLogin: store.get('openAtLogin') !== false
  };
}

function setConfig(key, value) {
  store.set(key, value);
}

module.exports = {
  initStore,
  getConfig,
  setConfig,
  ALL_SUBJECTS,
  ALL_QUESTION_TYPES
};
