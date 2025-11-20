class AgentExecutor {
  constructor(projectPath, context) {
    this.projectPath = projectPath;
    this.context = context;
  }

  log(message, type = 'info') {
    this.context?.addLog({ type, message });
  }

  async checkCommand(cmd, name, downloadUrl) {
    const check = await window.electronAPI.checkCommand(cmd);
    if (!check?.exists) {
      const error = new Error(`${name} is not installed`);
      error.code = 'MISSING_RUNTIME';
      error.downloadUrl = downloadUrl;
      error.runtime = name;
      throw error;
    }
    this.log(`✅ ${name} detected: ${check.output?.trim() || 'installed'}`, 'success');
    return check.output?.trim();
  }

  async fileExists(path) {
    return await window.electronAPI.fileExists(path);
  }

  async readFile(path) {
    const result = await window.electronAPI.readFile(path);
    if (!result.success) {
      throw new Error(`Failed to read ${path}`);
    }
    return result.content;
  }

  async writeFile(path, content) {
    const result = await window.electronAPI.writeFile(path, content);
    if (!result.success) {
      throw new Error(`Failed to write ${path}`);
    }
  }

  async runCommand(cmd, args, cwd = this.projectPath) {
    const id = `${cmd}-${Date.now()}`;
    this.log(`Running: ${cmd} ${args.join(' ')}`, 'info');
    
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      const outputHandler = (data) => {
        if (data.id === id) {
          output += data.data;
        }
      };

      const completeHandler = (data) => {
        if (data.id === id) {
          window.electronAPI.removeListener('command-output', outputHandler);
          window.electronAPI.removeListener('command-complete', completeHandler);
          
          if (data.code === 0) {
            resolve({ success: true, output });
          } else {
            reject(new Error(`Command failed with code ${data.code}: ${errorOutput || output}`));
          }
        }
      };

      window.electronAPI.on('command-output', outputHandler);
      window.electronAPI.on('command-complete', completeHandler);

      window.electronAPI.spawnCommand(cmd, args, cwd, id).catch(reject);
    });
  }

  async waitForPath(path, maxWait = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      const exists = await this.fileExists(path);
      if (exists) return true;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AgentExecutor;
