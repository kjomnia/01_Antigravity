const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendPrintData: (data) => ipcRenderer.invoke('print-data', data),
    readIni: () => ipcRenderer.invoke('read-ini-file'),
    saveIni: (content) => ipcRenderer.invoke('save-ini-file', content),
    saveImage: (data) => ipcRenderer.invoke('save-image', data),
    readImage: (filename) => ipcRenderer.invoke('read-image', filename),
    focusWindow: () => ipcRenderer.send('focus-window'),
    isElectron: true
});
