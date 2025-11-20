class AutonomousAgent {
  constructor(projectContext) {
    this.context = projectContext;
    this.memory = this.loadMemory();
    this.currentTask = null;
    this.taskQueue = [];
    this.retryAttempts = {};
    this.maxRetries = 3;
  }

  loadMemory() {
    try {
      const stored = localStorage.getItem('agent-memory');
      return stored ? JSON.parse(stored) : {
        successfulSetups: [],
        failedSetups: [],
        errorPatterns: {},
        solutions: {},
      };
    } catch {
      return { successfulSetups: [], failedSetups: [], errorPatterns: {}, solutions: {} };
    }
  }

  saveMemory() {
    try {
      localStorage.setItem('agent-memory', JSON.stringify(this.memory));
    } catch (err) {
      console.error('Failed to save memory:', err);
    }
  }

  async analyzeProject(projectPath, analysis) {
    const plan = {
      steps: [],
      risks: [],
      estimatedTime: 0,
    };

    // Check memory for similar projects
    const similar = this.findSimilarProject(analysis);
    if (similar) {
      this.context.addLog({ type: 'info', message: `Found similar project setup in memory` });
      plan.steps = similar.steps;
      return plan;
    }

    // Build plan based on project type
    if (analysis.isDocker) {
      plan.steps.push({ action: 'checkDocker', params: {} });
      plan.steps.push({ action: 'runDockerSetup', params: { hasCompose: analysis.manager === 'docker-compose' } });
    } else if (analysis.language === 'nodejs') {
      plan.steps.push({ action: 'checkNode', params: {} });
      plan.steps.push({ action: 'checkEnv', params: {} });
      plan.steps.push({ action: 'installDeps', params: { manager: 'npm' } });
      plan.steps.push({ action: 'startServer', params: {} });
    } else if (analysis.language) {
      plan.steps.push({ action: 'checkRuntime', params: { lang: analysis.language } });
      plan.steps.push({ action: 'installDeps', params: { manager: analysis.manager } });
    }

    return plan;
  }

  findSimilarProject(analysis) {
    const similar = this.memory.successfulSetups.find(s => 
      s.language === analysis.language && s.manager === analysis.manager
    );
    return similar;
  }

  async executeSetup(projectPath, analysis) {
    this.context.addLog({ type: 'info', message: '🤖 Autonomous agent starting...' });
    
    const plan = await this.analyzeProject(projectPath, analysis);
    this.taskQueue = [...plan.steps];

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      this.currentTask = task;

      try {
        this.context.addLog({ type: 'info', message: `Executing: ${task.action}` });
        await this.executeTask(task, projectPath, analysis);
        this.recordSuccess(task);
      } catch (error) {
        this.context.addLog({ type: 'error', message: `Task failed: ${error.message}` });
        
        const solution = await this.handleError(task, error, projectPath, analysis);
        if (solution) {
          this.context.addLog({ type: 'info', message: `Applying solution: ${solution.description}` });
          this.taskQueue.unshift(solution.task);
        } else {
          throw error;
        }
      }
    }

    this.recordSetupSuccess(analysis);
    this.context.addLog({ type: 'success', message: '✅ Autonomous setup completed!' });
  }

  async executeTask(task, projectPath, analysis) {
    const { action, params } = task;

    switch (action) {
      case 'checkDocker':
        return await this.checkDocker();
      
      case 'checkNode':
        return await this.checkNode();
      
      case 'checkRuntime':
        return await this.checkRuntime(params.lang);
      
      case 'checkEnv':
        return await this.checkEnv(projectPath);
      
      case 'installDeps':
        return await this.installDeps(projectPath, params.manager);
      
      case 'runDockerSetup':
        return await this.runDockerSetup(projectPath, params.hasCompose);
      
      case 'startServer':
        return await this.startServer(projectPath);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async checkDocker() {
    const check = await window.electronAPI.checkCommand('docker');
    if (!check?.exists) {
      const error = new Error('Docker not installed');
      error.downloadUrl = 'https://www.docker.com/products/docker-desktop';
      error.fixable = true;
      throw error;
    }
    this.context.addLog({ type: 'success', message: '✅ Docker available' });
  }

  async checkNode() {
    const check = await window.electronAPI.checkCommand('node');
    if (!check?.exists) {
      const error = new Error('Node.js not installed');
      error.downloadUrl = 'https://nodejs.org/';
      error.fixable = true;
      throw error;
    }
    this.context.addLog({ type: 'success', message: '✅ Node.js available' });
  }

  async checkRuntime(lang) {
    const runtimes = {
      Python: 'python',
      Java: 'java',
      Go: 'go',
      Rust: 'cargo',
      PHP: 'php',
      Ruby: 'ruby',
      Elixir: 'elixir',
    };

    const cmd = runtimes[lang];
    if (!cmd) return;

    const check = await window.electronAPI.checkCommand(cmd);
    if (!check?.exists) {
      const error = new Error(`${lang} not installed`);
      error.fixable = true;
      throw error;
    }
    this.context.addLog({ type: 'success', message: `✅ ${lang} available` });
  }

  async checkEnv(projectPath) {
    const envExists = await window.electronAPI.fileExists(`${projectPath}/.env`);
    const envExampleExists = await window.electronAPI.fileExists(`${projectPath}/.env.example`);

    if (!envExists && envExampleExists) {
      const result = await window.electronAPI.readFile(`${projectPath}/.env.example`);
      if (result.success) {
        await window.electronAPI.writeFile(`${projectPath}/.env`, result.content);
        this.context.addLog({ type: 'success', message: '✅ Created .env from template' });
      }
    }
  }

  async installDeps(projectPath, manager) {
    const commands = {
      npm: ['npm', ['install']],
      pip: ['pip', ['install', '-r', 'requirements.txt']],
      maven: ['mvn', ['clean', 'install']],
      gradle: ['gradle', ['build']],
      cargo: ['cargo', ['build']],
      composer: ['composer', ['install']],
      bundle: ['bundle', ['install']],
    };

    const [cmd, args] = commands[manager] || ['npm', ['install']];
    const installId = `install-${Date.now()}`;
    
    await window.electronAPI.spawnCommand(cmd, args, projectPath, installId);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    this.context.addLog({ type: 'success', message: '✅ Dependencies installed' });
  }

  async runDockerSetup(projectPath, hasCompose) {
    if (hasCompose) {
      const id = `docker-compose-${Date.now()}`;
      await window.electronAPI.spawnCommand('docker-compose', ['up', '--build', '-d'], projectPath, id);
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      const buildId = `docker-build-${Date.now()}`;
      await window.electronAPI.spawnCommand('docker', ['build', '-t', 'app', '.'], projectPath, buildId);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const runId = `docker-run-${Date.now()}`;
      await window.electronAPI.spawnCommand('docker', ['run', '-d', '-p', '3000:3000', 'app'], projectPath, runId);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    this.context.addLog({ type: 'success', message: '✅ Docker containers running' });
  }

  async startServer(projectPath) {
    const pkgResult = await window.electronAPI.readFile(`${projectPath}/package.json`);
    if (!pkgResult.success) return;

    const pkg = JSON.parse(pkgResult.content);
    const scriptName = pkg.scripts?.dev ? 'dev' : pkg.scripts?.start ? 'start' : null;
    
    if (scriptName) {
      const startId = `start-${Date.now()}`;
      await window.electronAPI.spawnCommand('npm', ['run', scriptName], projectPath, startId);
      await new Promise(resolve => setTimeout(resolve, 3000));
      this.context.addLog({ type: 'success', message: '✅ Server started' });
    }
  }

  async handleError(task, error, projectPath, analysis) {
    const errorKey = `${task.action}-${error.message}`;
    
    // Check memory for known solution
    if (this.memory.solutions[errorKey]) {
      return this.memory.solutions[errorKey];
    }

    // Retry logic
    const retryKey = `${task.action}-${Date.now()}`;
    this.retryAttempts[retryKey] = (this.retryAttempts[retryKey] || 0) + 1;

    if (this.retryAttempts[retryKey] < this.maxRetries) {
      this.context.addLog({ type: 'warning', message: `Retrying... (${this.retryAttempts[retryKey]}/${this.maxRetries})` });
      return { task, description: 'Retry same task' };
    }

    // Learn from error
    this.recordError(task, error, analysis);

    // Suggest manual intervention
    if (error.downloadUrl) {
      this.context.addLog({ type: 'error', message: `Please install from: ${error.downloadUrl}` });
    }

    return null;
  }

  recordSuccess(task) {
    // Track successful tasks
  }

  recordError(task, error, analysis) {
    const errorPattern = {
      task: task.action,
      error: error.message,
      language: analysis.language,
      timestamp: Date.now(),
    };

    this.memory.failedSetups.push(errorPattern);
    this.saveMemory();
  }

  recordSetupSuccess(analysis) {
    this.memory.successfulSetups.push({
      language: analysis.language,
      manager: analysis.manager,
      steps: this.taskQueue,
      timestamp: Date.now(),
    });
    this.saveMemory();
  }
}

export default AutonomousAgent;
