class SystemDependencyChecker {
  constructor(projectContext) {
    this.context = projectContext;
  }

  async checkAll() {
    const results = {
      docker: await this.checkDocker(),
      git: await this.checkGit(),
      node: await this.checkNode(),
      python: await this.checkPython(),
      buildEssential: await this.checkBuildEssential(),
      libpqDev: await this.checkLibpqDev(),
    };

    const missing = Object.entries(results)
      .filter(([_, v]) => !v.installed)
      .map(([k, v]) => ({ name: k, ...v }));

    return { results, missing };
  }

  async checkDocker() {
    try {
      const result = await window.electronAPI.checkCommand('docker');
      if (!result.exists) return { installed: false, canAutoInstall: false, installUrl: 'https://www.docker.com/products/docker-desktop' };
      
      const versionResult = await window.electronAPI.runCommand('docker --version', [], process.cwd());
      return { installed: true, version: versionResult?.output || 'unknown' };
    } catch {
      return { installed: false, canAutoInstall: false, installUrl: 'https://www.docker.com/products/docker-desktop' };
    }
  }

  async checkGit() {
    try {
      const result = await window.electronAPI.checkCommand('git');
      if (!result.exists) return { installed: false, canAutoInstall: false, installUrl: 'https://git-scm.com/downloads' };
      
      return { installed: true, version: result.output };
    } catch {
      return { installed: false, canAutoInstall: false, installUrl: 'https://git-scm.com/downloads' };
    }
  }

  async checkNode() {
    try {
      const result = await window.electronAPI.checkCommand('node');
      if (!result.exists) return { installed: false, canAutoInstall: false, installUrl: 'https://nodejs.org/' };
      
      return { installed: true, version: result.output };
    } catch {
      return { installed: false, canAutoInstall: false, installUrl: 'https://nodejs.org/' };
    }
  }

  async checkPython() {
    try {
      const result = await window.electronAPI.checkCommand('python');
      const result3 = await window.electronAPI.checkCommand('python3');
      
      if (!result.exists && !result3.exists) {
        return { installed: false, canAutoInstall: false, installUrl: 'https://www.python.org/downloads/' };
      }
      
      return { installed: true, version: result.output || result3.output };
    } catch {
      return { installed: false, canAutoInstall: false, installUrl: 'https://www.python.org/downloads/' };
    }
  }

  async checkBuildEssential() {
    const platform = navigator.platform.toLowerCase();
    const isWin = platform.includes('win');
    const isMac = platform.includes('mac');
    
    if (isWin) {
      const result = await window.electronAPI.checkCommand('cl');
      return { 
        installed: result.exists, 
        canAutoInstall: !result.exists,
        installCmd: 'npm install --global windows-build-tools',
        installUrl: 'https://visualstudio.microsoft.com/downloads/'
      };
    }
    
    if (isMac) {
      const result = await window.electronAPI.checkCommand('gcc');
      return { 
        installed: result.exists, 
        canAutoInstall: !result.exists,
        installCmd: 'xcode-select --install'
      };
    }
    
    // Linux
    const result = await window.electronAPI.checkCommand('gcc');
    return { 
      installed: result.exists, 
      canAutoInstall: !result.exists,
      installCmd: 'sudo apt-get install -y build-essential'
    };
  }

  async checkLibpqDev() {
    const platform = navigator.platform.toLowerCase();
    const isWin = platform.includes('win');
    const isMac = platform.includes('mac');
    
    if (isWin) {
      return { installed: true, note: 'Not required on Windows' };
    }
    
    if (isMac) {
      const result = await window.electronAPI.checkCommand('pg_config');
      return { 
        installed: result.exists, 
        canAutoInstall: !result.exists,
        installCmd: 'brew install postgresql'
      };
    }
    
    // Linux
    const result = await window.electronAPI.checkCommand('pg_config');
    return { 
      installed: result.exists, 
      canAutoInstall: !result.exists,
      installCmd: 'sudo apt-get install -y libpq-dev'
    };
  }

  async autoInstall(dependency) {
    const { addLog, showToast, addTerminalOutput } = this.context;
    
    const checks = {
      docker: () => this.checkDocker(),
      git: () => this.checkGit(),
      node: () => this.checkNode(),
      python: () => this.checkPython(),
      buildEssential: () => this.checkBuildEssential(),
      libpqDev: () => this.checkLibpqDev(),
    };

    const depInfo = await checks[dependency]();
    
    if (!depInfo.canAutoInstall) {
      showToast(`${dependency} requires manual installation`, 'warning');
      if (depInfo.installUrl) {
        window.electronAPI.openExternal(depInfo.installUrl);
      }
      return { success: false, manual: true };
    }

    addLog({ type: 'info', message: `Installing ${dependency}...` });
    showToast(`Installing ${dependency}...`, 'info');

    try {
      const cmdId = `install-${dependency}-${Date.now()}`;
      
      window.electronAPI.onCommandOutput((data) => {
        if (data.id === cmdId) {
          addTerminalOutput({ text: data.data, type: data.type });
        }
      });

      await window.electronAPI.runCommand(depInfo.installCmd, [], process.cwd(), cmdId);
      
      addLog({ type: 'success', message: `${dependency} installed successfully` });
      showToast(`${dependency} installed`, 'success');
      return { success: true };
    } catch (err) {
      addLog({ type: 'error', message: `Failed to install ${dependency}: ${err.message}` });
      showToast(`Failed to install ${dependency}`, 'error');
      return { success: false, error: err.message };
    }
  }
}

export default SystemDependencyChecker;
