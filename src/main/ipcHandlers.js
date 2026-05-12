const { ipcMain } = require('electron');
const { getConfig, setConfig } = require('./store');
const {
  getRandomQuestion, addRecord, getRecords, getRecordDates,
  getAllQuestions, addQuestion, updateQuestion, deleteQuestion, getQuestionCount
} = require('./db');

function registerIpcHandlers({ getQuizWindow, getAdminWindow, createAdminWindow }) {

  ipcMain.handle('get-config', () => getConfig());

  ipcMain.handle('set-config', (_, key, value) => {
    setConfig(key, value);
    return true;
  });

  ipcMain.handle('verify-password', (_, password) => {
    const config = getConfig();
    const a = (password ?? '').trim();
    const b = (config.adminPassword ?? '').trim();
    return a === b;
  });

  ipcMain.handle('get-question', (_, subject, grade, excludeIds) => {
    return getRandomQuestion(subject, grade, excludeIds || []);
  });

  ipcMain.handle('submit-answer', (_, subject, questionId, isCorrect) => {
    addRecord(subject, questionId, isCorrect);
    return true;
  });

  ipcMain.handle('get-records', (_, date) => getRecords(date));

  ipcMain.handle('get-record-dates', () => getRecordDates());

  ipcMain.handle('get-all-questions', (_, filters) => getAllQuestions(filters));

  ipcMain.handle('add-question', (_, q) => addQuestion(q));

  ipcMain.handle('update-question', (_, id, q) => {
    updateQuestion(id, q);
    return true;
  });

  ipcMain.handle('delete-question', (_, id) => {
    deleteQuestion(id);
    return true;
  });

  ipcMain.handle('get-question-count', (_, subject, grade) => getQuestionCount(subject, grade));

  ipcMain.on('open-admin-window', () => createAdminWindow());

  ipcMain.on('quiz-reload-session', () => {
    const quizWin = getQuizWindow();
    if (quizWin && !quizWin.isDestroyed()) {
      quizWin.webContents.send('quiz-session-reset');
      quizWin.focus();
    }
  });
}

module.exports = { registerIpcHandlers };
