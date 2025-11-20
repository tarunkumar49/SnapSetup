const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');
const chokidar = require('chokidar');

let mainWindow = null;
const watchers = new Map();
const runningCommands = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    backgroundColor: '#1e1e1e',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = 'http://localhost:5173';

  // If dev server is available, load it; otherwise load built index.html
  mainWindow.loadURL(devUrl).catch(() => {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  });

  // Show window when ready to prevent flashing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return { success: true, content: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const result = entries.map((ent) => ({
      name: ent.name,
      path: path.join(dirPath, ent.name),
      type: ent.isDirectory() ? 'directory' : 'file',
    }));
    return { success: true, entries: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('select-folder', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle('open-path', async (event, targetPath) => {
  try {
    await shell.openPath(targetPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('check-command', (event, cmd) => {
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const res = spawnSync(whichCmd, [cmd], { encoding: 'utf8' });
    const output = (res.stdout || res.stderr || '').toString();
    return { exists: res.status === 0, output: output.trim() };
  } catch (err) {
    return { exists: false, output: '' };
  }
});

// Run commands and stream output back to renderer
ipcMain.handle('run-command', (event, command, args = [], cwd = process.cwd(), id = null) => {
  return new Promise((resolve) => {
    try {
      // Execute command through shell
      const child = spawn(command, [], { 
        cwd, 
        shell: true,
        windowsHide: true
      });

      // store child temporarily if id provided
      const cmdId = id || `${Date.now()}`;
      runningCommands.set(cmdId, child);

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('STDOUT:', output);
          if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send('command-output', { id: cmdId, data: output, type: 'stdout' });
          }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          const output = data.toString();
          console.log('STDERR:', output);
          if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send('command-output', { id: cmdId, data: output, type: 'stderr' });
          }
        });
      }

      child.on('error', (err) => {
        console.log('ERROR:', err.message);
        event.sender.send('command-error', { id: cmdId, error: err.message });
      });

      child.on('close', (code) => {
        console.log('CLOSE:', code);
        event.sender.send('command-complete', { id: cmdId, code });
        runningCommands.delete(cmdId);
        resolve({ success: true, code });
      });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

// Spawn a long-running command and return immediately with pid and id
ipcMain.handle('spawn-command', (event, command, args = [], cwd = process.cwd(), id = null) => {
  try {
    const spawnOptions = { 
      cwd, 
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', CI: 'true' }
    };
    
    // On Windows, prevent console window from appearing
    if (process.platform === 'win32') {
      spawnOptions.windowsHide = true;
      spawnOptions.windowsVerbatimArguments = false;
      spawnOptions.detached = false;
    }
    
    const child = spawn(command, args, spawnOptions);
    const cmdId = id || `${Date.now()}`;
    runningCommands.set(cmdId, child);

    child.stdout.on('data', (data) => {
      event.sender.send('command-output', { id: cmdId, data: data.toString(), type: 'stdout' });
    });

    child.stderr.on('data', (data) => {
      event.sender.send('command-output', { id: cmdId, data: data.toString(), type: 'stderr' });
    });

    child.on('close', (code) => {
      event.sender.send('command-complete', { id: cmdId, code });
      runningCommands.delete(cmdId);
    });

    return { success: true, pid: child.pid, id: cmdId };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kill-command', (event, idOrPid) => {
  try {
    // try by id
    if (runningCommands.has(idOrPid)) {
      const child = runningCommands.get(idOrPid);
      
      // On Windows, kill the entire process tree
      if (process.platform === 'win32') {
        try {
          spawn('taskkill', ['/pid', child.pid, '/T', '/F'], { shell: true });
        } catch (e) {
          child.kill('SIGKILL');
        }
      } else {
        child.kill('SIGKILL');
      }
      
      runningCommands.delete(idOrPid);
      return { success: true };
    }

    // try by pid
    for (const [key, child] of runningCommands.entries()) {
      if (child.pid === Number(idOrPid)) {
        if (process.platform === 'win32') {
          try {
            spawn('taskkill', ['/pid', child.pid, '/T', '/F'], { shell: true });
          } catch (e) {
            child.kill('SIGKILL');
          }
        } else {
          child.kill('SIGKILL');
        }
        runningCommands.delete(key);
        return { success: true };
      }
    }

    // Fallback: try to kill by port if we know it
    if (process.platform === 'win32') {
      // Try to find and kill process on common dev ports
      const ports = [5173, 5174, 3000, 3001, 5000, 8080];
      for (const port of ports) {
        try {
          spawn('npx', ['kill-port', port], { shell: true });
        } catch (e) {
          // ignore
        }
      }
    }
    
    return { success: false, error: 'Process not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('kill-all-commands', () => {
  try {
    let killed = 0;
    for (const [id, child] of runningCommands.entries()) {
      if (process.platform === 'win32') {
        try {
          spawn('taskkill', ['/pid', child.pid, '/T', '/F'], { shell: true });
        } catch (e) {
          child.kill('SIGKILL');
        }
      } else {
        child.kill('SIGKILL');
      }
      runningCommands.delete(id);
      killed++;
    }
    return { success: true, killed };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// File watching
ipcMain.handle('watch-files', async (event, basePath, patterns = []) => {
  try {
    const watcher = chokidar.watch(patterns.length ? patterns.map((p) => path.join(basePath, p)) : basePath, {
      persistent: true,
      ignoreInitial: true,
    });

    const id = Date.now().toString();
    watchers.set(id, watcher);

    watcher.on('all', (eventName, changedPath) => {
      event.sender.send('file-changed', { id, event: eventName, path: changedPath });
    });

    return { success: true, id };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-watching', (event, watcherId) => {
  const w = watchers.get(watcherId);
  if (w) {
    w.close();
    watchers.delete(watcherId);
    return { success: true };
  }
  return { success: false, error: 'Watcher not found' };
});

// Generic helper to remove listeners from renderer-side channels
ipcMain.handle('remove-listener', (event, channel) => {
  // No-op on main side; renderer will remove ipcRenderer listeners directly
  return { success: true };
});

// Return the user data path for storing settings
ipcMain.handle('get-user-data-path', () => {
  try {
    return app.getPath('userData');
  } catch (err) {
    return null;
  }
});

// Get user home directory
ipcMain.handle('get-home-dir', () => {
  try {
    return app.getPath('home');
  } catch (err) {
    return null;
  }
});

// Get username
ipcMain.handle('get-username', () => {
  try {
    return process.env.USERNAME || process.env.USER || 'user';
  } catch (err) {
    return 'user';
  }
});

// Window controls
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
    return { success: true };
  }
  return { success: false };
});

// Detect installed code editors
ipcMain.handle('detect-editors', () => {
  const editors = [];
  const platform = process.platform;

  const editorCommands = {
    'vscode': { cmd: 'code', name: 'VS Code', icon: 'vscode' },
    'cursor': { cmd: 'cursor', name: 'Cursor', icon: 'cursor' },
    'sublime': { cmd: 'subl', name: 'Sublime Text', icon: 'sublime' },
    'atom': { cmd: 'atom', name: 'Atom', icon: 'atom' },
    'webstorm': { cmd: 'webstorm', name: 'WebStorm', icon: 'webstorm' },
  };

  for (const [key, editor] of Object.entries(editorCommands)) {
    const whichCmd = platform === 'win32' ? 'where' : 'which';
    const res = spawnSync(whichCmd, [editor.cmd], { encoding: 'utf8' });
    if (res.status === 0) {
      editors.push({ id: key, ...editor, available: true });
    }
  }

  return editors;
});

// Open project in code editor
ipcMain.handle('open-in-editor', (event, editorCmd, projectPath) => {
  try {
    // Wrap path in quotes to handle spaces
    const quotedPath = `"${projectPath}"`;
    const child = spawn(editorCmd, [quotedPath], { 
      detached: true, 
      stdio: 'ignore',
      shell: true
    });
    child.unref();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Run a command in a new system terminal window
ipcMain.handle('run-in-terminal', (event, command, cwd = process.cwd(), shellType = null) => {
  try {
    const platform = process.platform;

    if (platform === 'win32') {
      // Use PowerShell by default
      const usePowershell = shellType === 'powershell' || !shellType;
      const exe = usePowershell ? 'powershell.exe' : 'cmd.exe';
      const args = usePowershell ? ['-NoExit', '-Command', command] : ['/k', command];
      const child = spawn(exe, args, { cwd, detached: true, windowsHide: false, shell: false });
      child.unref();
      return { success: true };
    } else if (platform === 'darwin') {
      // macOS: use AppleScript to tell Terminal.app to do it
      const osaCommand = `tell application \"Terminal\" to do script \"cd '${cwd.replace(/'/g, "'\\''")}' ; ${command.replace(/"/g, '\\"')}\"`;
      spawn('osascript', ['-e', osaCommand]);
      return { success: true };
    } else {
      // linux - try common terminals
      const terminals = ['gnome-terminal', 'konsole', 'x-terminal-emulator', 'xfce4-terminal', 'xterm'];
      for (const term of terminals) {
        try {
          const proc = spawn(term, ['-e', `bash -lc "cd '${cwd}' ; ${command}; exec bash"`], { detached: true, shell: false });
          proc.unref();
          return { success: true };
        } catch (err) {
          // try next
        }
      }
      // Fallback: spawn in background (no visible terminal)
      spawn(command, { cwd, shell: true, detached: true }).unref();
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});
