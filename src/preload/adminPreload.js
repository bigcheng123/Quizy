const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adminAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  notifyQuizSessionReload: () => ipcRenderer.send('quiz-reload-session'),
  getAllQuestions: (filters) => ipcRenderer.invoke('get-all-questions', filters),
  addQuestion: (q) => ipcRenderer.invoke('add-question', q),
  updateQuestion: (id, q) => ipcRenderer.invoke('update-question', id, q),
  deleteQuestion: (id) => ipcRenderer.invoke('delete-question', id),
  getQuestionCount: (subject, grade) => ipcRenderer.invoke('get-question-count', subject, grade),
  getRecords: (date) => ipcRenderer.invoke('get-records', date),
  getRecordDates: () => ipcRenderer.invoke('get-record-dates')
});
