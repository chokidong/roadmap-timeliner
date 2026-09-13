import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('roadmapDesktop', {
  open: () => ipcRenderer.invoke('roadmap:open'),
  save: (text: string, path?: string) => ipcRenderer.invoke('roadmap:save', { text, path }),
  reload: (path: string) => ipcRenderer.invoke('roadmap:reload', path),
  rememberRecent: (path: string) => ipcRenderer.invoke('roadmap:remember-recent', path),
  confirmDiscard: () => ipcRenderer.invoke('roadmap:confirm-discard'),
  exportHtml: (html: string, defaultName?: string) => ipcRenderer.invoke('roadmap:export-html', { html, defaultName }),
  showAbout: () => ipcRenderer.invoke('roadmap:show-about'),
  onOpenRequest: (callback: () => void) => ipcRenderer.on('roadmap:open-request', () => callback()),
  onSaveRequest: (callback: () => void) => ipcRenderer.on('roadmap:save-request', () => callback()),
  onSaveAsRequest: (callback: () => void) => ipcRenderer.on('roadmap:save-as-request', () => callback()),
  onReloadRequest: (callback: () => void) => ipcRenderer.on('roadmap:reload-request', () => callback()),
  onNewRequest: (callback: () => void) => ipcRenderer.on('roadmap:new-request', () => callback()),
  onExportHtmlRequest: (callback: () => void) => ipcRenderer.on('roadmap:export-html-request', () => callback())
});
