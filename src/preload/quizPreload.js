const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quizAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  onQuizSessionReset: (fn) => {
    ipcRenderer.on('quiz-session-reset', () => {
      Promise.resolve()
        .then(() => fn())
        .catch((e) => console.error(e));
    });
  },
  verifyPassword: (pwd) => ipcRenderer.invoke('verify-password', pwd),
  getQuestion: (subject, grade, excludeIds) => ipcRenderer.invoke('get-question', subject, grade, excludeIds),
  submitAnswer: (subject, questionId, isCorrect) => ipcRenderer.invoke('submit-answer', subject, questionId, isCorrect),
  unlockDesktop: () => ipcRenderer.send('unlock-desktop'),
  openAdmin: () => ipcRenderer.send('open-admin-window'),
  emergencyQuit: () => ipcRenderer.send('emergency-quit')
});
