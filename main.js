const { app, BrowserWindow, Menu, MenuItem, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { openDatabase } = require('./src/db');
const { buildCertificate, letterheadFields } = require('./src/certificate');

app.setName('Peoples Register');

if (process.env.REGISTER_DEMO) {
  const demoData = path.join(process.env.REGISTER_DEMO, 'userdata');
  fs.mkdirSync(demoData, { recursive: true });
  app.setPath('userData', demoData);
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.stalphonsa.peoplesregister');
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow = null;
let register = null;

function wasmFile() {
  const candidates = [
    path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error('Could not find the local database engine.');
  return found;
}

function userMessage(error) {
  return error && error.message ? error.message : 'Something went wrong.';
}

function registerHandlers() {
  ipcMain.handle('members:list', (_event, query) => register.list(typeof query === 'string' ? query : ''));
  ipcMain.handle('members:create', (_event, member) => register.create(member));
  ipcMain.handle('members:update', (_event, id, member) => register.update(id, member));
  ipcMain.handle('members:remove', (_event, id) => register.remove(id));
  ipcMain.handle('settings:get', () => register.getSettings());
  ipcMain.handle('settings:setEmail', (_event, email) => register.setEmail(email));
  ipcMain.handle('certificate:letterhead', () => letterheadFields(register.getSettings().parishEmail));
  ipcMain.handle('certificate:build', (_event, payload) => {
    const member = register.getMember(payload && payload.id);
    if (!member) throw new Error('That member could not be found.');
    return buildCertificate(member, {
      purpose: payload.purpose,
      refNo: payload.refNo,
      issueDate: payload.issueDate,
      parishEmail: register.getSettings().parishEmail,
    });
  });
  ipcMain.handle('print', () => printCertificate());
  ipcMain.handle('db:backup', () => backupDatabase());
  ipcMain.handle('db:restore', () => restoreDatabase());
}

async function backupDatabase() {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup the register',
    defaultPath: 'parish-register-backup.sqlite',
    filters: [{ name: 'Register database', extensions: ['sqlite'] }],
  });
  if (result.canceled || !result.filePath) return { cancelled: true };
  register.exportTo(result.filePath);
  return { cancelled: false, path: result.filePath };
}

async function restoreDatabase() {
  const warning = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Replace register', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'Import database',
    message: 'Importing replaces every member stored on this computer.',
    detail: "Choose a backup made by People's Register.",
  });
  if (warning.response !== 0) return { cancelled: true };
  const picked = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a register backup',
    filters: [{ name: 'Register database', extensions: ['sqlite'] }],
    properties: ['openFile'],
  });
  if (picked.canceled || !picked.filePaths[0]) return { cancelled: true };
  const settings = register.importFrom(picked.filePaths[0]);
  return { cancelled: false, settings };
}

function printCertificate() {
  return new Promise((resolve) => {
    mainWindow.webContents.print({
      silent: false,
      printBackground: true,
      color: true,
      pageSize: 'A4',
      header: '',
      footer: '',
    }, (success, failureReason) => {
      resolve({ ok: Boolean(success), reason: failureReason || '' });
    });
  });
}

function attachEditMenu() {
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu();
    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'undo' }));
      menu.append(new MenuItem({ role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'cut' }));
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ role: 'paste' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
    } else if (params.selectionText) {
      menu.append(new MenuItem({ role: 'copy' }));
    }
    if (menu.items.length) menu.popup();
  });
}

async function createWindow() {
  const dbPath = path.join(app.getPath('userData'), 'parish-register.sqlite');
  try {
    register = await openDatabase(dbPath, wasmFile());
  } catch (error) {
    dialog.showErrorBox("People's Register", `The register database could not be opened.\n\n${userMessage(error)}`);
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "People's Register — St. Alphonsa Church",
    backgroundColor: '#0b1020',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.removeMenu();
  attachEditMenu();
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  await mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  const demoScript = path.join(__dirname, 'scripts', 'demo.js');
  if (process.env.REGISTER_DEMO && fs.existsSync(demoScript)) {
    require(demoScript)(mainWindow);
  }
}

if (gotLock) {
  registerHandlers();
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(createWindow).catch((error) => {
    dialog.showErrorBox("People's Register", userMessage(error));
    app.quit();
  });
  app.on('window-all-closed', () => {
    if (register) register.close();
    app.quit();
  });
}
