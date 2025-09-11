const { ipcRenderer, shell } = require('electron');

// Since contextIsolation is false, we can attach directly to window
window.electronAPI = {
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  convertFiles: (data) => ipcRenderer.invoke('convert-files', data),
  getDefaultOutputFolder: () => ipcRenderer.invoke('get-default-output-folder'),
  ensureOutputFolder: (folderPath) => ipcRenderer.invoke('ensure-output-folder', folderPath),
  openPath: (folderPath) => shell.openPath(folderPath),
  
  // Settings API
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  getAllSettings: () => ipcRenderer.invoke('get-all-settings'),
  getConversionMethod: () => ipcRenderer.invoke('get-conversion-method'),
  checkOfficeAvailability: () => ipcRenderer.invoke('check-office-availability'),
  
  // PDF Merge API
  mergePDFs: (data) => ipcRenderer.invoke('merge-pdfs', data),
  selectPDFFiles: () => ipcRenderer.invoke('select-pdf-files'),
  
  // Handle file drops from main process
  onFileDropped: (callback) => {
    ipcRenderer.on('file-dropped', (event, filePaths) => callback(filePaths));
  }
};

console.log('Preload: electronAPI attached to window');