import DependencyInstaller from './DependencyInstaller';

class SetupManager {
  constructor(projectPath, context) {
    this.projectPath = projectPath;
    this.context = context;
    this.retryCount = 2;
    this.retryDelay = 2000;
  }

  // Run full setup process
  async runFullSetup() {
    try {
      // Step 1: System checks
      const systemChecks = await this.runSystemChecks();
      
      if (!systemChecks.node) {
        throw new Error('Node.js is not installed. Please install Node.js from https://nodejs.org/');
      }

      // Step 2: Detect project structure
      let projectStructure;
      try {
        projectStructure = await this.detectProjectStructure();
      } catch (err) {
        console.error('Error detecting project structure:', err);
        projectStructure = { isFullstack: false, hasBackend: false, hasFrontend: false };
      }
      
      // Step 3: Check .env files
      await this.checkEnvFile();

      // Step 4: Check for Docker Compose or generate if needed
      const hasDockerCompose = await window.electronAPI.fileExists(
        `${this.projectPath}/docker-compose.yml`
      );

      // If fullstack with database, ensure docker-compose exists
      if (projectStructure.isFullstack && projectStructure.hasDatabase && !hasDockerCompose) {
        if (this.context) {
          this.context.addLog({ type: 'info', message: 'Fullstack project detected with database. Generating docker-compose.yml...' });
        }
        const dockerResult = await this.generateDockerCompose();
        if (dockerResult.success) {
          await window.electronAPI.writeFile(
            `${this.projectPath}/docker-compose.yml`,
            dockerResult.content
          );
          if (this.context) {
            this.context.addLog({ type: 'success', message: 'docker-compose.yml generated successfully' });
          }
        }
      }

      // Step 5: Run setup based on structure
      if (projectStructure.isFullstack) {
        return await this.runFullstackSetup(projectStructure, systemChecks);
      } else if (hasDockerCompose && systemChecks.docker) {
        return await this.runWithDocker();
      } else {
        return await this.runNormalSetup();
      }
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  }

  // Detect project structure (monorepo, fullstack, etc.)
  async detectProjectStructure() {
    const structure = {
      isFullstack: false,
      isMonorepo: false,
      hasBackend: false,
      hasFrontend: false,
      hasDatabase: false,
      backendPath: null,
      frontendPath: null,
      backendFramework: null,
      frontendFramework: null,
      database: null,
    };

    try {
      // Read main package.json
      const pkgResult = await window.electronAPI.readFile(`${this.projectPath}/package.json`);
      if (!pkgResult.success) return structure;

      const packageJson = JSON.parse(pkgResult.content);
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies } || {};

    // Detect backend
    if (deps.express) structure.backendFramework = 'Express';
    else if (deps.fastify) structure.backendFramework = 'Fastify';
    else if (deps['@nestjs/core']) structure.backendFramework = 'NestJS';
    else if (deps.koa) structure.backendFramework = 'Koa';

    // Detect frontend
    if (deps.next) structure.frontendFramework = 'Next.js';
    else if (deps.react || deps['react-dom']) structure.frontendFramework = 'React';
    else if (deps.vue) structure.frontendFramework = 'Vue';
    else if (deps.vite) structure.frontendFramework = 'Vite';

    // Detect database
    if (deps.mongodb || deps.mongoose) structure.database = 'MongoDB';
    else if (deps.pg) structure.database = 'PostgreSQL';
    else if (deps.mysql || deps.mysql2) structure.database = 'MySQL';

    structure.hasBackend = !!structure.backendFramework;
    structure.hasFrontend = !!structure.frontendFramework;
    structure.hasDatabase = !!structure.database;
    structure.isFullstack = structure.hasBackend && structure.hasFrontend;

      // Check for monorepo structure
      const clientExists = await window.electronAPI.fileExists(`${this.projectPath}/client/package.json`);
      const serverExists = await window.electronAPI.fileExists(`${this.projectPath}/server/package.json`);
      const frontendExists = await window.electronAPI.fileExists(`${this.projectPath}/frontend/package.json`);
      const backendExists = await window.electronAPI.fileExists(`${this.projectPath}/backend/package.json`);

    if (clientExists || frontendExists) {
      structure.isMonorepo = true;
      structure.frontendPath = clientExists ? `${this.projectPath}/client` : `${this.projectPath}/frontend`;
    }

    if (serverExists || backendExists) {
      structure.isMonorepo = true;
      structure.backendPath = serverExists ? `${this.projectPath}/server` : `${this.projectPath}/backend`;
    }

      // If not monorepo but fullstack, both are in root
      if (structure.isFullstack && !structure.isMonorepo) {
        structure.backendPath = this.projectPath;
        structure.frontendPath = this.projectPath;
      }
    } catch (err) {
      console.error('Error in detectProjectStructure:', err);
    }

    return structure;
  }

  // Run fullstack setup
  async runFullstackSetup(structure, systemChecks) {
    if (this.context) {
      this.context.addLog({ type: 'info', message: 'Fullstack project detected. Starting sequential setup...' });
      this.context.setSetupStatus('installing');
    }

    // Step 1: Start database if needed
    if (structure.hasDatabase && systemChecks.docker) {
      if (this.context) {
        this.context.addLog({ type: 'info', message: `Starting ${structure.database} via Docker...` });
      }
      await this.startDatabase();
    }

    // Step 2: Install and start backend
    if (structure.hasBackend) {
      if (this.context) {
        this.context.addLog({ type: 'info', message: `Installing backend (${structure.backendFramework})...` });
      }
      await this.setupBackend(structure.backendPath || this.projectPath);
    }

    // Step 3: Install and start frontend
    if (structure.hasFrontend) {
      if (this.context) {
        this.context.addLog({ type: 'info', message: `Installing frontend (${structure.frontendFramework})...` });
      }
      await this.setupFrontend(structure.frontendPath || this.projectPath);
    }

    if (this.context) {
      this.context.setSetupStatus('completed');
      this.context.addLog({ type: 'success', message: 'Fullstack setup completed successfully!' });
    }

    return { success: true, mode: 'fullstack', structure };
  }

  // Setup backend
  async setupBackend(backendPath) {
    if (this.context) {
      this.context.addLog({ type: 'info', message: '📦 Installing backend dependencies...' });
    }

    // Install dependencies and wait for completion
    const installId = `backend-install-${Date.now()}`;
    await window.electronAPI.spawnCommand('npm', ['install'], backendPath, installId);
    
    // Wait for node_modules to be created
    let retries = 0;
    while (retries < 30) {
      const nodeModulesExists = await window.electronAPI.fileExists(`${backendPath}/node_modules`);
      if (nodeModulesExists) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    // Additional wait to ensure installation completes
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (this.context) {
      this.context.addLog({ type: 'success', message: '✅ Backend dependencies installed' });
    }

    // Start backend server
    const pkgResult = await window.electronAPI.readFile(`${backendPath}/package.json`);
    if (pkgResult.success) {
      const packageJson = JSON.parse(pkgResult.content);
      const scripts = packageJson.scripts || {};
      
      let scriptName = 'dev';
      if (!scripts.dev && scripts.start) scriptName = 'start';
      else if (!scripts.dev && scripts['start:dev']) scriptName = 'start:dev';
      
      if (scripts[scriptName]) {
        if (this.context) {
          this.context.addLog({ type: 'info', message: `🚀 Starting backend server (npm run ${scriptName})...` });
        }
        
        await window.electronAPI.spawnCommand('npm', ['run', scriptName], backendPath, `backend-${Date.now()}`);
        
        // Wait for backend to be ready
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        if (this.context) {
          this.context.setRunningServers(prev => ({ ...prev, backend: 'http://localhost:5000' }));
          this.context.addLog({ type: 'success', message: '✅ Backend running at http://localhost:5000' });
        }
      }
    }
  }

  // Setup frontend
  async setupFrontend(frontendPath) {
    if (this.context) {
      this.context.addLog({ type: 'info', message: '📦 Installing frontend dependencies...' });
    }

    // Install dependencies and wait for completion
    const installId = `frontend-install-${Date.now()}`;
    await window.electronAPI.spawnCommand('npm', ['install'], frontendPath, installId);
    
    // Wait for node_modules to be created
    let retries = 0;
    while (retries < 30) {
      const nodeModulesExists = await window.electronAPI.fileExists(`${frontendPath}/node_modules`);
      if (nodeModulesExists) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    // Additional wait to ensure installation completes
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (this.context) {
      this.context.addLog({ type: 'success', message: '✅ Frontend dependencies installed' });
    }

    // Start frontend server
    const pkgResult = await window.electronAPI.readFile(`${frontendPath}/package.json`);
    if (pkgResult.success) {
      const packageJson = JSON.parse(pkgResult.content);
      const scripts = packageJson.scripts || {};
      
      let scriptName = 'dev';
      if (!scripts.dev && scripts.start) scriptName = 'start';
      
      if (scripts[scriptName]) {
        if (this.context) {
          this.context.addLog({ type: 'info', message: `🚀 Starting frontend server (npm run ${scriptName})...` });
        }
        
        await window.electronAPI.spawnCommand('npm', ['run', scriptName], frontendPath, `frontend-${Date.now()}`);
        
        // Detect frontend port
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        let port = 3000;
        if (deps.vite) port = 5173;
        else if (deps.next) port = 3000;
        
        if (this.context) {
          this.context.setRunningServers(prev => ({ ...prev, frontend: `http://localhost:${port}` }));
          this.context.addLog({ type: 'success', message: `✅ Frontend running at http://localhost:${port}` });
        }
      }
    }
  }

  // Start database via docker-compose
  async startDatabase() {
    const hasDockerCompose = await window.electronAPI.fileExists(
      `${this.projectPath}/docker-compose.yml`
    );

    if (!hasDockerCompose) return;

    try {
      // Start only database services
      await window.electronAPI.spawnCommand(
        'docker-compose',
        ['up', '-d'],
        this.projectPath,
        `docker-db-${Date.now()}`
      );
      
      // Wait for database to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if (this.context) {
        this.context.addLog({ type: 'success', message: 'Database started successfully' });
      }
    } catch (error) {
      if (this.context) {
        this.context.addLog({ type: 'warning', message: 'Failed to start database. You may need to start it manually.' });
      }
    }
  }

  // Run system checks
  async runSystemChecks() {
    const checks = {
      node: null,
      npm: null,
      docker: null,
    };

    try {
      // Check Node
      const nodeCheck = await window.electronAPI.checkCommand('node');
      if (nodeCheck && nodeCheck.exists) {
        checks.node = nodeCheck.output.trim() || 'installed';
      } else {
        checks.node = false;
      }

      // Check npm
      const npmCheck = await window.electronAPI.checkCommand('npm');
      if (npmCheck && npmCheck.exists) {
        checks.npm = npmCheck.output.trim() || 'installed';
      } else {
        checks.npm = false;
      }

      // Check Docker
      const dockerCheck = await window.electronAPI.checkCommand('docker');
      if (dockerCheck && dockerCheck.exists) {
        checks.docker = true;
      } else {
        checks.docker = false;
      }
    } catch (error) {
      console.error('System check error:', error);
      // Assume Node/npm are available if check fails
      checks.node = 'unknown';
      checks.npm = 'unknown';
      checks.docker = false;
    }

    return checks;
  }

  // Check .env file
  async checkEnvFile() {
    const envExists = await window.electronAPI.fileExists(
      `${this.projectPath}/.env`
    );
    const envExampleExists = await window.electronAPI.fileExists(
      `${this.projectPath}/.env.example`
    );

    if (!envExists && envExampleExists) {
      // Read .env.example and create .env with placeholders
      const envExampleResult = await window.electronAPI.readFile(
        `${this.projectPath}/.env.example`
      );
      
      if (envExampleResult.success) {
        const placeholderContent = this.generateEnvPlaceholders(envExampleResult.content);
        await window.electronAPI.writeFile(
          `${this.projectPath}/.env`,
          placeholderContent
        );
        return { created: true, fromExample: true };
      }
    }

    return { created: false };
  }

  // Generate env placeholders
  generateEnvPlaceholders(envExampleContent) {
    const lines = envExampleContent.split('\n');
    const placeholderLines = lines.map((line) => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') {
        return line;
      }

      // Replace values with placeholders
      const [key, ...valueParts] = line.split('=');
      if (key) {
        return `${key}=PLACEHOLDER_${key.trim()}`;
      }
      return line;
    });

    return placeholderLines.join('\n');
  }

  // Run normal setup (npm install)
  async runNormalSetup() {
    if (this.context) {
      this.context.setSetupStatus('installing');
      this.context.addLog({ type: 'info', message: '📦 Installing dependencies...' });
    }

    // Check for package-lock.json
    const hasLockFile = await window.electronAPI.fileExists(
      `${this.projectPath}/package-lock.json`
    );

    // Always use npm install for better compatibility
    const command = 'install';
    
    // Run with app's terminal and wait for completion
    const installId = `npm-${command}-${Date.now()}`;
    const installResult = await window.electronAPI.spawnCommand('npm', [command], this.projectPath, installId);
    
    // Wait for node_modules to be created
    let retries = 0;
    while (retries < 30) {
      const nodeModulesExists = await window.electronAPI.fileExists(`${this.projectPath}/node_modules`);
      if (nodeModulesExists) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    // Additional wait to ensure installation completes
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (this.context) {
      this.context.addLog({ type: 'success', message: '✅ Dependencies installed successfully' });
      this.context.setSetupStatus('running');
    }

    // After installation, try to start the project
    try {
      await this.startProject();
    } catch (error) {
      if (this.context) {
        this.context.addLog({ type: 'warning', message: `Could not auto-start: ${error.message}` });
        this.context.setSetupStatus('completed');
      }
    }

    return { success: true };
  }

  // Install dependencies with progress tracking
  async installDependenciesWithProgress() {
    const installer = new DependencyInstaller(this.projectPath, (progress) => {
      if (!this.context) return;

      switch (progress.type) {
        case 'installing':
          this.context.updateDependencyStatus(progress.package, 'installing');
          this.context.addLog({
            type: 'info',
            message: `Installing ${progress.package} (${progress.current}/${progress.total})`,
          });
          break;
        case 'installed':
          this.context.updateDependencyStatus(progress.package, 'installed');
          this.context.addLog({
            type: 'success',
            message: `✓ Installed ${progress.package}`,
          });
          break;
        case 'failed':
          this.context.updateDependencyStatus(progress.package, 'failed', progress.error);
          this.context.addLog({
            type: 'error',
            message: `✗ Failed to install ${progress.package}: ${progress.error}`,
          });
          break;
      }
    });

  const result = await installer.installDependencies(this.context.dependencies);
    
    if (result.failed > 0) {
      this.context.showToast(
        `Installation completed with ${result.failed} failures`,
        'warning'
      );
    }

    return result;
  }

  // Start project
  async startProject() {
    // Read package.json to find start script
    const pkgResult = await window.electronAPI.readFile(
      `${this.projectPath}/package.json`
    );

    if (!pkgResult.success) {
      throw new Error('Cannot read package.json');
    }

    const packageJson = JSON.parse(pkgResult.content);
    const scripts = packageJson.scripts || {};

    // Prefer dev script, fallback to start
    let scriptName = 'dev';
    if (!scripts.dev && scripts.start) {
      scriptName = 'start';
    } else if (!scripts.dev && !scripts.start) {
      if (this.context) {
        this.context.addLog({ type: 'warning', message: 'No start/dev script found in package.json' });
      }
      throw new Error('No start/dev script found in package.json');
    }

    if (this.context) {
      this.context.addLog({ type: 'info', message: `🚀 Starting project (npm run ${scriptName})...` });
    }

    // Verify node_modules exists before starting
    const nodeModulesExists = await window.electronAPI.fileExists(`${this.projectPath}/node_modules`);
    if (!nodeModulesExists) {
      throw new Error('node_modules not found. Please run npm install first.');
    }

    // Use app's terminal - spawn command for streaming output
    const startId = `npm-start-${Date.now()}`;
    const spawnRes = await window.electronAPI.spawnCommand('npm', ['run', scriptName], this.projectPath, startId);
    
    if (spawnRes && spawnRes.success) {
      if (this.context && this.context.setRunningProcessId) {
        this.context.setRunningProcessId(startId); // Use the ID, not PID
      }
      if (this.context) {
        this.context.addLog({ type: 'info', message: `Process ID: ${startId} (Press Ctrl+C in terminal to stop)` });
      }
    }

    // Wait for server to start and parse output for actual URL
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (this.context) {
      this.context.addLog({ type: 'success', message: `✅ Server started! Check terminal output for the URL` });
      this.context.setSetupStatus('completed');
    }

    return { success: true, script: scriptName };
  }

  // Run with Docker
  async runWithDocker() {
    const dockerId = `docker-compose-${Date.now()}`;
    await window.electronAPI.spawnCommand('docker-compose', ['up'], this.projectPath, dockerId);
    return { success: true, mode: 'docker' };
  }

  // Generate docker-compose.yml
  async generateDockerCompose() {
    // Read package.json to analyze the project
    const pkgResult = await window.electronAPI.readFile(
      `${this.projectPath}/package.json`
    );

    if (!pkgResult.success) {
      throw new Error('Cannot read package.json');
    }

    const packageJson = JSON.parse(pkgResult.content);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Detect project type and generate appropriate compose file
    let composeContent = 'version: \'3.8\'\n\nservices:\n';

    // Backend service
    if (deps.express || deps.fastify || deps.koa) {
      composeContent += `  backend:
    image: node:18
    working_dir: /usr/src/app
    volumes:
      - ./:/usr/src/app
      - /usr/src/app/node_modules
    command: sh -c "npm install && npm run dev"
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - PORT=5000
    depends_on:`;

      // Add DB dependency if needed
      if (deps.mongodb || deps.mongoose) {
        composeContent += '\n      - mongo';
      } else if (deps.pg) {
        composeContent += '\n      - postgres';
      } else if (deps.mysql || deps.mysql2) {
        composeContent += '\n      - mysql';
      }
      composeContent += '\n\n';
    }

    // Frontend service
    if (deps.react || deps['react-dom'] || deps.next || deps.vite) {
      const port = deps.next ? '3000' : deps.vite ? '5173' : '3000';
      composeContent += `  frontend:
    image: node:18
    working_dir: /usr/src/app
    volumes:
      - ./:/usr/src/app
      - /usr/src/app/node_modules
    command: sh -c "npm install && npm run dev"
    ports:
      - "${port}:${port}"
    environment:
      - NODE_ENV=development
\n`;
    }

    // Database services
    if (deps.mongodb || deps.mongoose) {
      composeContent += `  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
\n`;
    }

    if (deps.pg) {
      composeContent += `  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
\n`;
    }

    if (deps.mysql || deps.mysql2) {
      composeContent += `  mysql:
    image: mysql:8
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=mydb
\n`;
    }

    // Add volumes section
    composeContent += '\nvolumes:\n';
    if (deps.mongodb || deps.mongoose) composeContent += '  mongo_data:\n';
    if (deps.pg) composeContent += '  postgres_data:\n';
    if (deps.mysql || deps.mysql2) composeContent += '  mysql_data:\n';

    return {
      success: true,
      content: composeContent,
    };
  }

  // Wait for a URL to respond (simple fetch retry)
  async waitForUrl(url, timeoutMs = 15000) {
    const start = Date.now();
    const tryOnce = async () => {
      try {
        const resp = await fetch(url, { method: 'GET' });
        return resp.ok;
      } catch (err) {
        return false;
      }
    };

    while (Date.now() - start < timeoutMs) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await tryOnce();
      if (ok) return true;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 1000));
    }
    return false;
  }

  // Install single package with retry
  async installPackage(packageName, retries = this.retryCount) {
    try {
      const installId = `install-${packageName}-${Date.now()}`;
      await window.electronAPI.spawnCommand('npm', ['install', packageName], this.projectPath, installId);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { success: true };
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return await this.installPackage(packageName, retries - 1);
      }
      throw error;
    }
  }
}

export default SetupManager;
