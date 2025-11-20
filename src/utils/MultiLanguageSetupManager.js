import { PythonErrorHandler } from './PythonErrorHandler.js';
import { UniversalErrorHandler } from './UniversalErrorHandler.js';
import { EdgeCaseHandler } from './EdgeCaseHandler.js';

class MultiLanguageSetupManager {
  constructor(projectPath, context) {
    this.projectPath = projectPath;
    this.context = context;
    this.pythonErrorHandler = new PythonErrorHandler(context);
    this.universalErrorHandler = new UniversalErrorHandler(context);
    this.edgeCaseHandler = new EdgeCaseHandler(context);
    this.currentLanguage = null;
    this.terminalOutput = '';
    this.setupListeners();
  }

  setupListeners() {
    if (window.electronAPI) {
      window.electronAPI.onCommandOutput((data) => {
        this.terminalOutput += data.data;
        // Check for errors in real-time
        if (data.type === 'stderr' && this.terminalOutput.includes('Error')) {
          this.handleTerminalError(data.data);
        }
      });
    }
  }

  async handleTerminalError(errorOutput) {
    // Check edge cases first
    const edgeCase = await this.edgeCaseHandler.handle(errorOutput, this.projectPath);
    if (edgeCase) {
      if (edgeCase.success && edgeCase.command) {
        await this.executeFixCommand(edgeCase.command, edgeCase.message);
      }
      return edgeCase;
    }

    // Try language-specific handler
    if (this.currentLanguage) {
      const result = await this.universalErrorHandler.handleError(
        errorOutput,
        this.currentLanguage,
        this.projectPath
      );
      
      if (result.success && result.command) {
        await this.executeFixCommand(result.command, result.message);
      }
      return result;
    }

    return { success: false, message: 'No handler available' };
  }

  async executeFixCommand(command, message) {
    this.context?.addLog({ type: 'info', message: `⚡ Auto-fixing: ${message}` });
    const [cmd, ...args] = command.split(' ');
    const fixId = `auto-fix-${Date.now()}`;
    await window.electronAPI.spawnCommand(cmd, args, this.projectPath, fixId);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async detectLanguage() {
    const checks = [
      { file: 'package.json', lang: 'nodejs', manager: 'npm' },
      { file: 'requirements.txt', lang: 'python', manager: 'pip' },
      { file: 'Pipfile', lang: 'python', manager: 'pipenv' },
      { file: 'pyproject.toml', lang: 'python', manager: 'poetry' },
      { file: 'pom.xml', lang: 'java', manager: 'maven' },
      { file: 'build.gradle', lang: 'java', manager: 'gradle' },
      { file: 'go.mod', lang: 'go', manager: 'go' },
      { file: 'Cargo.toml', lang: 'rust', manager: 'cargo' },
      { file: 'composer.json', lang: 'php', manager: 'composer' },
      { file: 'Gemfile', lang: 'ruby', manager: 'bundler' },
      { file: 'mix.exs', lang: 'elixir', manager: 'mix' },
    ];

    for (const check of checks) {
      const exists = await window.electronAPI.fileExists(`${this.projectPath}/${check.file}`);
      if (exists) {
        this.currentLanguage = check.lang;
        return check;
      }
    }
    return null;
  }

  async checkSystemRequirements(lang) {
    const requirements = {
      nodejs: { cmd: 'node', name: 'Node.js', url: 'https://nodejs.org/' },
      python: { cmd: 'python', name: 'Python', url: 'https://www.python.org/downloads/' },
      java: { cmd: 'java', name: 'Java JDK', url: 'https://www.oracle.com/java/technologies/downloads/' },
      go: { cmd: 'go', name: 'Go', url: 'https://go.dev/dl/' },
      rust: { cmd: 'cargo', name: 'Rust', url: 'https://www.rust-lang.org/tools/install' },
      php: { cmd: 'php', name: 'PHP', url: 'https://www.php.net/downloads' },
      ruby: { cmd: 'ruby', name: 'Ruby', url: 'https://www.ruby-lang.org/en/downloads/' },
      elixir: { cmd: 'elixir', name: 'Elixir', url: 'https://elixir-lang.org/install.html' },
    };

    const req = requirements[lang];
    if (!req) return { installed: true };

    const check = await window.electronAPI.checkCommand(req.cmd);
    return {
      installed: check?.exists || false,
      name: req.name,
      url: req.url,
      version: check?.output?.trim() || null,
    };
  }

  async runSetup() {
    try {
      // Check for Docker setup first (highest priority)
      const hasDockerfile = await window.electronAPI.fileExists(`${this.projectPath}/Dockerfile`);
      const hasDockerCompose = await window.electronAPI.fileExists(`${this.projectPath}/docker-compose.yml`);
      
      if (hasDockerfile || hasDockerCompose) {
        return await this.setupWithDocker(hasDockerCompose);
      }
    } catch (err) {
      console.error('Error checking Docker files:', err);
    }

    // Fallback to language-specific setup
    const detected = await this.detectLanguage();
    if (!detected) {
      throw new Error('Could not detect project language');
    }

    this.context?.addLog({ type: 'info', message: `Detected ${detected.lang} project using ${detected.manager}` });

    // Check system requirements
    const sysCheck = await this.checkSystemRequirements(detected.lang);
    if (!sysCheck.installed) {
      const error = new Error(`${sysCheck.name} is not installed`);
      error.downloadUrl = sysCheck.url;
      error.languageName = sysCheck.name;
      throw error;
    }

    this.context?.addLog({ type: 'success', message: `${sysCheck.name} detected${sysCheck.version ? ': ' + sysCheck.version : ''}` });

    switch (detected.manager) {
      case 'npm':
        return await this.setupNodeJS();
      case 'pip':
        return await this.setupPython('pip');
      case 'pipenv':
        return await this.setupPython('pipenv');
      case 'poetry':
        return await this.setupPython('poetry');
      case 'maven':
        return await this.setupJava('maven');
      case 'gradle':
        return await this.setupJava('gradle');
      case 'go':
        return await this.setupGo();
      case 'cargo':
        return await this.setupRust();
      case 'composer':
        return await this.setupPHP();
      case 'bundler':
        return await this.setupRuby();
      case 'mix':
        return await this.setupElixir();
      default:
        throw new Error(`Unsupported package manager: ${detected.manager}`);
    }
  }

  async waitForPath(pathToCheck, maxRetries = 30) {
    let retries = 0;
    while (retries < maxRetries) {
      const exists = await window.electronAPI.fileExists(pathToCheck);
      if (exists) return true;
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    return false;
  }

  async setupNodeJS() {
    this.context?.setSetupStatus('installing');
    this.context?.addLog({ type: 'info', message: '📦 Installing Node.js dependencies...' });

    const installId = `npm-install-${Date.now()}`;
    await window.electronAPI.spawnCommand('npm', ['install'], this.projectPath, installId);
    
    await this.waitForPath(`${this.projectPath}/node_modules`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    this.context?.addLog({ type: 'success', message: '✅ Dependencies installed' });
    return await this.startNodeJS();
  }

  async startNodeJS() {
    const pkgResult = await window.electronAPI.readFile(`${this.projectPath}/package.json`);
    if (!pkgResult.success) throw new Error('Cannot read package.json');

    const pkg = JSON.parse(pkgResult.content);
    const scriptName = pkg.scripts?.dev ? 'dev' : pkg.scripts?.start ? 'start' : null;
    
    if (!scriptName) {
      this.context?.addLog({ type: 'warning', message: 'No start/dev script found' });
      this.context?.setSetupStatus('completed');
      return { success: true };
    }

    const nodeModulesExists = await window.electronAPI.fileExists(`${this.projectPath}/node_modules`);
    if (!nodeModulesExists) throw new Error('node_modules not found');

    this.context?.addLog({ type: 'info', message: `🚀 Starting server (npm run ${scriptName})...` });
    
    const startId = `npm-start-${Date.now()}`;
    await window.electronAPI.spawnCommand('npm', ['run', scriptName], this.projectPath, startId);
    await new Promise(resolve => setTimeout(resolve, 3000));

    this.context?.addLog({ type: 'success', message: '✅ Server started' });
    this.context?.setSetupStatus('completed');
    return { success: true };
  }

  async setupPython(manager) {
    this.context?.setSetupStatus('installing');
    this.pythonErrorHandler.reset();
    
    // Parse requirements to show progress
    let packages = [];
    if (manager === 'pip') {
      try {
        const reqFile = await window.electronAPI.readFile(`${this.projectPath}/requirements.txt`);
        if (reqFile.success) {
          packages = reqFile.content
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('#'))
            .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].trim());
          
          this.context?.addLog({ 
            type: 'info', 
            message: `📦 Found ${packages.length} packages to install` 
          });
        }
      } catch (err) {
        console.error('Error reading requirements:', err);
      }
    }

    this.context?.addLog({ type: 'info', message: `📦 Installing Python dependencies with ${manager}...` });

    const commands = {
      pip: ['pip', ['install', '-r', 'requirements.txt']],
      pipenv: ['pipenv', ['install']],
      poetry: ['poetry', ['install']],
    };

    const [cmd, args] = commands[manager];
    const installId = `${manager}-install-${Date.now()}`;
    
    let installedCount = 0;
    const outputHandler = (data) => {
      if (data.id === installId) {
        // Track installation progress
        if (data.data.includes('Successfully installed') || data.data.includes('Requirement already satisfied')) {
          installedCount++;
          const progress = packages.length > 0 ? Math.round((installedCount / packages.length) * 100) : 0;
          this.context?.addLog({ 
            type: 'info', 
            message: `⏳ Progress: ${installedCount}/${packages.length} packages (${progress}%)` 
          });
        }
        
        // Check for errors
        if (data.type === 'stderr' && (data.data.includes('ERROR') || data.data.includes('Error'))) {
          this.handleTerminalError(data.data);
        }
      }
    };

    window.electronAPI.onCommandOutput(outputHandler);
    
    try {
      await window.electronAPI.spawnCommand(cmd, args, this.projectPath, installId);
      await new Promise(resolve => setTimeout(resolve, 5000));

      this.context?.addLog({ type: 'success', message: '✅ Python dependencies installed' });
      this.context?.setSetupStatus('completed');
      return { success: true };
    } catch (error) {
      // Try to auto-fix the error
      const fixResult = await this.pythonErrorHandler.handleError(error.message, this.projectPath);
      
      if (fixResult.success && fixResult.command) {
        this.context?.addLog({ type: 'warning', message: `🔧 Attempting auto-fix...` });
        const [fixCmd, ...fixArgs] = fixResult.command.split(' ');
        await window.electronAPI.spawnCommand(fixCmd, fixArgs, this.projectPath, `fix-${Date.now()}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Retry original command
        await window.electronAPI.spawnCommand(cmd, args, this.projectPath, `retry-${Date.now()}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        this.context?.addLog({ type: 'success', message: '✅ Python dependencies installed after auto-fix' });
        this.context?.setSetupStatus('completed');
        return { success: true };
      }
      
      throw error;
    }
  }

  async setupJava(manager) {
    this.context?.setSetupStatus('installing');
    this.context?.addLog({ type: 'info', message: `📦 Building Java project with ${manager}...` });

    // Check for Maven/Gradle
    const toolCheck = await window.electronAPI.checkCommand(manager === 'maven' ? 'mvn' : 'gradle');
    if (!toolCheck?.exists) {
      const urls = {
        maven: 'https://maven.apache.org/download.cgi',
        gradle: 'https://gradle.org/install/',
      };
      const error = new Error(`${manager} is not installed`);
      error.downloadUrl = urls[manager];
      error.languageName = manager.charAt(0).toUpperCase() + manager.slice(1);
      throw error;
    }

    const commands = {
      maven: ['mvn', ['clean', 'install']],
      gradle: ['gradle', ['build']],
    };

    const [cmd, args] = commands[manager];
    const installId = `${manager}-build-${Date.now()}`;
    await window.electronAPI.spawnCommand(cmd, args, this.projectPath, installId);

    const checkPaths = {
      maven: `${this.projectPath}/target`,
      gradle: `${this.projectPath}/build`,
    };

    await this.waitForPath(checkPaths[manager]);
    await new Promise(resolve => setTimeout(resolve, 3000));

    this.context?.addLog({ type: 'success', message: '✅ Java project built' });
    this.context?.setSetupStatus('completed');
    return { success: true };
  }

  async setupGo() {
    this.context?.setSetupStatus('installing');
    this.context?.addLog({ type: 'info', message: '📦 Installing Go dependencies...' });

    const installId = `go-mod-${Date.now()}`;
    await window.electronAPI.spawnCommand('go', ['mod', 'download'], this.projectPath, installId);
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    this.context?.addLog({ type: 'success', message: '✅ Go dependencies installed' });
    this.context?.setSetupStatus('completed');
    return { success: true };
  }

  async setupRust() {
    this.context?.setSetupStatus('installing');
    this.context?.addLog({ type: 'info', message: '📦 Building Rust project...' });

    const installId = `cargo-build-${Date.now()}`;
    await window.electronAPI.spawnCommand('cargo', ['build'], this.projectPath, installId);
    
    await this.waitForPath(`${this.projectPath}/target`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    this.context?.addLog({ type: 'success', message: '✅ Rust project built' });
    this.context?.setSetupStatus('completed');
    return { success: true };
  }

  async setupPHP() {
    this.context?.setSetupStatus('installing');
    this.context?.addLog({ type: 'info', message: '📦 Installing PHP dependencies...' });

    // Check for Composer
    const composerCheck = await window.electronAPI.checkCommand('composer');
    if (!composerCheck?.exists) {
      const error = new Error('Composer is not installed');
      error.downloadUrl = 'https://getcomposer.org/download/';
      error.languageName = 'Composer';
      throw error;
    }

    const installId = `composer-install-${Date.now()}`;
    await window.electronAPI.spawnCommand('composer', ['install'], this.projectPath, installId);
    
    await this.waitForPath(`${this.projectPath}/vendor`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    this.context?.addLog({ type: 'success', message: '✅ PHP dependencies installed' });
    this.context?.setSetupStatus('completed');
    return { success: true };
  }

  async setupRuby() {
    this.context?.setSetupStatus('installing');
    this.context?.addLog({ type: 'info', message: '📦 Installing Ruby gems...' });

    // Check for Bundler
    const bundlerCheck = await window.electronAPI.checkCommand('bundle');
    if (!bundlerCheck?.exists) {
      const error = new Error('Bundler is not installed');
      error.downloadUrl = 'https://bundler.io/';
      error.languageName = 'Bundler';
      throw error;
    }

    const installId = `bundle-install-${Date.now()}`;
    await window.electronAPI.spawnCommand('bundle', ['install'], this.projectPath, installId);
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    this.context?.addLog({ type: 'success', message: '✅ Ruby gems installed' });
    this.context?.setSetupStatus('completed');
    return { success: true };
  }

  async setupElixir() {
    this.context?.setSetupStatus('installing');
    this.context?.addLog({ type: 'info', message: '📦 Installing Elixir dependencies...' });

    // Check for Mix
    const mixCheck = await window.electronAPI.checkCommand('mix');
    if (!mixCheck?.exists) {
      const error = new Error('Mix is not installed');
      error.downloadUrl = 'https://elixir-lang.org/install.html';
      error.languageName = 'Elixir/Mix';
      throw error;
    }

    const installId = `mix-deps-${Date.now()}`;
    await window.electronAPI.spawnCommand('mix', ['deps.get'], this.projectPath, installId);
    
    await this.waitForPath(`${this.projectPath}/deps`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    this.context?.addLog({ type: 'success', message: '✅ Elixir dependencies installed' });
    this.context?.setSetupStatus('completed');
    return { success: true };
  }

  async setupWithDocker(hasCompose) {
    this.context?.setSetupStatus('installing');
    this.context?.addLog({ type: 'info', message: '🐳 Docker setup detected!' });

    // Check for Docker
    const dockerCheck = await window.electronAPI.checkCommand('docker');
    if (!dockerCheck?.exists) {
      const error = new Error('Docker is not installed');
      error.downloadUrl = 'https://www.docker.com/products/docker-desktop';
      error.languageName = 'Docker';
      throw error;
    }

    // Check if Docker Desktop is running
    this.context?.addLog({ type: 'info', message: 'Checking if Docker Desktop is running...' });
    try {
      const testId = `docker-test-${Date.now()}`;
      await window.electronAPI.spawnCommand('docker', ['ps'], this.projectPath, testId);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      const error = new Error('Docker Desktop is not running. Please start Docker Desktop and try again.');
      error.code = 'DOCKER_NOT_RUNNING';
      throw error;
    }

    this.context?.addLog({ type: 'success', message: '✅ Docker is running' });

    if (hasCompose) {
      this.context?.addLog({ type: 'info', message: '📦 Running docker-compose up...' });
      const composeId = `docker-compose-${Date.now()}`;
      await window.electronAPI.spawnCommand('docker-compose', ['up', '--build', '-d'], this.projectPath, composeId);
      await new Promise(resolve => setTimeout(resolve, 5000));
      this.context?.addLog({ type: 'success', message: '✅ Docker containers started' });
    } else {
      this.context?.addLog({ type: 'info', message: '📦 Building Docker image...' });
      const buildId = `docker-build-${Date.now()}`;
      await window.electronAPI.spawnCommand('docker', ['build', '-t', 'app', '.'], this.projectPath, buildId);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      this.context?.addLog({ type: 'info', message: '🚀 Running Docker container...' });
      const runId = `docker-run-${Date.now()}`;
      await window.electronAPI.spawnCommand('docker', ['run', '-d', '-p', '3000:3000', 'app'], this.projectPath, runId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.context?.addLog({ type: 'success', message: '✅ Docker container running' });
    }

    this.context?.setSetupStatus('completed');
    return { success: true, mode: 'docker' };
  }
}

export default MultiLanguageSetupManager;
