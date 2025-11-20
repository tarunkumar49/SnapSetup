const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  checkCommand: (cmd) => ipcRenderer.invoke('check-command', cmd),
  runCommand: (command, args, cwd, id) => ipcRenderer.invoke('run-command', command, args, cwd, id),
  watchFiles: (basePath, patterns) => ipcRenderer.invoke('watch-files', basePath, patterns),
  stopWatching: (id) => ipcRenderer.invoke('stop-watching', id),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  runInTerminal: (command, cwd, shellType) => ipcRenderer.invoke('run-in-terminal', command, cwd, shellType),
  spawnCommand: (command, args, cwd, id) => ipcRenderer.invoke('spawn-command', command, args, cwd, id),
  killCommand: (idOrPid) => ipcRenderer.invoke('kill-command', idOrPid),
  killAllCommands: () => ipcRenderer.invoke('kill-all-commands'),
  // Event subscriptions
  onFileChanged: (cb) => ipcRenderer.on('file-changed', (e, data) => cb(data)),
  onCommandOutput: (cb) => ipcRenderer.on('command-output', (e, data) => cb(data)),
  onCommandComplete: (cb) => ipcRenderer.on('command-complete', (e, data) => cb(data)),
  onCommandError: (cb) => ipcRenderer.on('command-error', (e, data) => cb(data)),
  removeListener: (channel) => ipcRenderer.removeAllListeners(channel),
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
  getUsername: () => ipcRenderer.invoke('get-username'),
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  // Editor integration
  detectEditors: () => ipcRenderer.invoke('detect-editors'),
  openInEditor: (editorCmd, projectPath) => ipcRenderer.invoke('open-in-editor', editorCmd, projectPath),
});

console.log('electronAPI exposed to window:', typeof window !== 'undefined' ? !!window.electronAPI : 'window not available');
