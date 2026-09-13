import { app, BrowserWindow, Menu, dialog, ipcMain, MenuItemConstructorOptions } from 'electron';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const roadmapHtml = resolve(here, '../../../roadmap.html');
const iconPath = resolve(here, '../assets/icon.png');
let mainWindow: BrowserWindow | undefined;
let allowingClose = false;

type RecentFile = { path: string; openedAt: number };

app.name = 'Roadmap Timeliner';
app.setName('Roadmap Timeliner');

function showAboutDialog(): void {
  const options = {
    type: 'info' as const,
    title: 'About Roadmap Timeliner',
    message: 'Roadmap Timeliner',
    detail: 'Version 0.1.0\n\nA visual roadmap and timeline editor for modern planning.\nSupports JSON schema validation, AI Agent integration, and export formats.\n\nhttps://github.com/chokidong/roadmap-timeliner\nCopyright © 2026 Roadmap Timeliner',
    icon: iconPath,
    buttons: ['OK']
  };
  if (mainWindow) {
    void dialog.showMessageBox(mainWindow, options);
  } else {
    void dialog.showMessageBox(options);
  }
}

function startupRoadmapPath(): string | undefined {
  const candidate = process.argv.slice(1).find(argument => argument.endsWith('.json') && !argument.startsWith('--'));
  return candidate ? resolve(process.env.INIT_CWD || process.cwd(), candidate) : undefined;
}

function runRendererCommand(command: 'new' | 'open' | 'save' | 'saveAs' | 'reload' | 'exportHtml'): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const channel = {
    new: 'roadmap:new-request',
    open: 'roadmap:open-request',
    save: 'roadmap:save-request',
    saveAs: 'roadmap:save-as-request',
    reload: 'roadmap:reload-request',
    exportHtml: 'roadmap:export-html-request'
  }[command];
  mainWindow.webContents.send(channel);
}

async function exportPdf(): Promise<void> {
  if (!mainWindow) return;
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath: 'roadmap.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (result.canceled || !result.filePath) return;
  const pdf = await mainWindow.webContents.printToPDF({ landscape: true, printBackground: true, pageSize: 'A4' });
  if (pdf) await writeFile(result.filePath, pdf);
}

const recentFilePath = () => join(app.getPath('userData'), 'recent-roadmaps.json');
async function recentFiles(): Promise<RecentFile[]> {
  try {
    const parsed = JSON.parse(await readFile(recentFilePath(), 'utf8')) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is RecentFile => typeof value?.path === 'string' && typeof value?.openedAt === 'number').slice(0, 10) : [];
  } catch { return []; }
}
async function rememberRecent(path: string): Promise<void> {
  const next = [{ path, openedAt: Date.now() }, ...(await recentFiles()).filter(item => item.path !== path)].slice(0, 10);
  await writeFile(recentFilePath(), JSON.stringify(next, null, 2), 'utf8');
  await installMenu();
}
async function openRecent(path: string): Promise<void> {
  try {
    const payload = JSON.stringify({ path, text: await readFile(path, 'utf8') });
    await mainWindow?.webContents.executeJavaScript(`window.roadmapDesktopActions?.load?.(${payload})`);
    await rememberRecent(path);
  } catch {
    if (mainWindow) {
      await dialog.showMessageBox(mainWindow, { type: 'error', message: 'Unable to open this roadmap file.', detail: path });
    }
  }
}
async function openStartupRoadmap(path: string): Promise<void> {
  try {
    const payload = JSON.stringify({ path, text: await readFile(path, 'utf8'), force: true });
    const loaded = await mainWindow?.webContents.executeJavaScript(`window.roadmapDesktopActions?.load?.(${payload})`);
    if (loaded) await rememberRecent(path);
  } catch {
    if (mainWindow) {
      await dialog.showMessageBox(mainWindow, { type: 'error', message: 'Unable to open this roadmap file.', detail: path });
    }
  }
}

async function installMenu(): Promise<void> {
  const recent = await recentFiles();
  const isMac = process.platform === 'darwin';

  const fileSubmenu: MenuItemConstructorOptions[] = [
    { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => runRendererCommand('new') },
    { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => runRendererCommand('open') },
    {
      label: 'Open Recent',
      submenu: recent.length
        ? recent.map(item => ({ label: item.path, click: () => void openRecent(item.path) }))
        : [{ label: 'No Recent Files', enabled: false }]
    },
    { type: 'separator' },
    { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => runRendererCommand('save') },
    { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => runRendererCommand('saveAs') },
    { type: 'separator' },
    { label: 'Export HTML…', accelerator: 'CmdOrCtrl+E', click: () => runRendererCommand('exportHtml') },
    { label: 'Export PDF…', click: () => void exportPdf() },
    { label: 'Print…', accelerator: 'CmdOrCtrl+P', click: () => mainWindow?.webContents.print() }
  ];

  if (!isMac) {
    fileSubmenu.push({ type: 'separator' }, { role: 'quit' });
  }

  const template: MenuItemConstructorOptions[] = [];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { label: `About ${app.name}`, click: () => showAboutDialog() },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  template.push({
    label: 'File',
    submenu: fileSubmenu
  });

  template.push({
    label: 'Edit',
    submenu: [
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' }
    ]
  });

  if (isMac) {
    template.push({
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'front' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function writeAtomically(path: string, text: string): Promise<void> {
  const temporary = join(dirname(path), `.${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`);
  try {
    await writeFile(temporary, text, 'utf8');
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'Roadmap Timeliner',
    icon: iconPath,
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: join(here, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  void mainWindow.loadFile(roadmapHtml).then(async () => {
    const path = startupRoadmapPath();
    if (path) await openStartupRoadmap(path);
  });

  void installMenu();

  mainWindow.on('close', event => {
    if (allowingClose) return;
    event.preventDefault();
    void (async () => {
      const dirty = await mainWindow?.webContents.executeJavaScript('window.roadmapDesktopActions?.hasUnsavedChanges?.() ?? false').catch(() => false);
      if (!dirty) {
        allowingClose = true;
        mainWindow?.close();
        return;
      }
      const result = await dialog.showMessageBox(mainWindow!, {
        type: 'warning',
        buttons: ['Save', "Don't Save", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        message: 'You have unsaved changes.'
      });
      if (result.response === 2) return;
      if (result.response === 0) {
        const saved = await mainWindow?.webContents.executeJavaScript('window.roadmapDesktopActions?.save?.()').catch(() => false);
        if (!saved) return;
      }
      allowingClose = true;
      mainWindow?.close();
    })();
  });
}

ipcMain.handle('roadmap:confirm-discard', async () => {
  if (!mainWindow) return true;
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Discard Changes', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    message: 'Discard unsaved changes?',
    detail: 'You have unsaved changes that will be lost.'
  });
  return result.response === 0;
});

ipcMain.handle('roadmap:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'Roadmap JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths[0]) return { cancelled: true };
  const targetPath = result.filePaths[0];
  const fileContent = await readFile(targetPath, 'utf8');
  return { cancelled: false, path: targetPath, text: fileContent };
});

ipcMain.handle('roadmap:save', async (_event, payload: { text: string; path?: string }) => {
  let target = payload.path;
  if (!target) {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: 'roadmap.json',
      filters: [{ name: 'Roadmap JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return { cancelled: true };
    target = result.filePath;
  }
  await writeAtomically(target, payload.text);
  return { cancelled: false, path: target };
});

ipcMain.handle('roadmap:export-html', async (_event, payload: { html: string; defaultName?: string }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: payload.defaultName || 'roadmap.html',
    filters: [{ name: 'HTML Document', extensions: ['html', 'htm'] }]
  });
  if (result.canceled || !result.filePath) return { cancelled: true };
  await writeAtomically(result.filePath, payload.html);
  return { cancelled: false, path: result.filePath };
});

ipcMain.handle('roadmap:reload', async (_event, path: string) => ({ path, text: await readFile(path, 'utf8') }));
ipcMain.handle('roadmap:remember-recent', async (_event, path: string) => { await rememberRecent(path); });
app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    try {
      app.dock.setIcon(iconPath);
    } catch {
      // ignore
    }
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
