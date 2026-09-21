const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('register', {
  list: (query) => ipcRenderer.invoke('members:list', query ?? ''),
  create: (member) => ipcRenderer.invoke('members:create', member),
  update: (id, member) => ipcRenderer.invoke('members:update', id, member),
  remove: (id) => ipcRenderer.invoke('members:remove', id),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setEmail: (parishEmail) => ipcRenderer.invoke('settings:setEmail', parishEmail),
  letterhead: () => ipcRenderer.invoke('certificate:letterhead'),
  buildCertificate: (payload) => ipcRenderer.invoke('certificate:build', payload),
  print: () => ipcRenderer.invoke('print'),
  backup: () => ipcRenderer.invoke('db:backup'),
  restore: () => ipcRenderer.invoke('db:restore'),
});
