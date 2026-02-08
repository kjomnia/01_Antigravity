const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendPrintData: (data) => ipcRenderer.invoke('print-data', data),
    readIni: () => ipcRenderer.invoke('read-ini-file'),
    saveIni: (content) => ipcRenderer.invoke('save-ini-file', content),
    isElectron: true
});
