class BackendDetector {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  async detectBackends() {
    const backends = [];

    // Check for config file first
    const configBackend = await this.checkConfigFile();
    if (configBackend) return [configBackend];

    // Node.js
    const nodeBackend = await this.detectNode();
    if (nodeBackend) backends.push(nodeBackend);

    // Python
    const pythonBackend = await this.detectPython();
    if (pythonBackend) backends.push(pythonBackend);

    // Java
    const javaBackend = await this.detectJava();
    if (javaBackend) backends.push(javaBackend);

    // Go
    const goBackend = await this.detectGo();
    if (goBackend) backends.push(goBackend);

    // Ruby
    const rubyBackend = await this.detectRuby();
    if (rubyBackend) backends.push(rubyBackend);

    // PHP
    const phpBackend = await this.detectPHP();
    if (phpBackend) backends.push(phpBackend);

    // .NET
    const dotnetBackend = await this.detectDotNet();
    if (dotnetBackend) backends.push(dotnetBackend);

    // Docker
    const dockerBackend = await this.detectDocker();
    if (dockerBackend) backends.push(dockerBackend);

    return backends;
  }

  async checkConfigFile() {
    const configPath = `${this.projectPath}/snapsetup.config.json`;
    const exists = await window.electronAPI.fileExists(configPath);
    if (!exists) return null;

    const result = await window.electronAPI.readFile(configPath);
    if (!result.success) return null;

    const config = JSON.parse(result.content);
    return {
      type: 'custom',
      runtime: config.runtime,
      command: config.startCommand,
      port: config.port || 3000,
      healthCheck: config.healthCheck,
      env: config.env || {},
      useDocker: config.useDocker || false,
    };
  }

  async detectNode() {
    const pkgExists = await window.electronAPI.fileExists(`${this.projectPath}/package.json`);
    if (!pkgExists) return null;

    const result = await window.electronAPI.readFile(`${this.projectPath}/package.json`);
    if (!result.success) return null;

    const pkg = JSON.parse(result.content);
    const scripts = pkg.scripts || {};
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Detect framework
    let framework = 'Node.js';
    if (deps.express) framework = 'Express';
    else if (deps.fastify) framework = 'Fastify';
    else if (deps['@nestjs/core']) framework = 'NestJS';
    else if (deps.next) framework = 'Next.js';

    // Detect start command
    let command = 'npm run dev';
    if (scripts.dev) command = 'npm run dev';
    else if (scripts.start) command = 'npm start';
    else if (scripts['start:dev']) command = 'npm run start:dev';

    // Detect port
    let port = 3000;
    if (framework === 'Express' || framework === 'Fastify') port = 5000;
    else if (framework === 'Next.js') port = 3000;

    return {
      type: 'nodejs',
      framework,
      command,
      port,
      healthCheck: '/health',
      runtime: 'node',
    };
  }

  async detectPython() {
    const reqExists = await window.electronAPI.fileExists(`${this.projectPath}/requirements.txt`);
    const pyprojectExists = await window.electronAPI.fileExists(`${this.projectPath}/pyproject.toml`);
    
    if (!reqExists && !pyprojectExists) return null;

    let framework = 'Python';
    let command = 'python app.py';
    let port = 8000;

    // Check for common files
    const flaskExists = await window.electronAPI.fileExists(`${this.projectPath}/app.py`);
    const djangoExists = await window.electronAPI.fileExists(`${this.projectPath}/manage.py`);
    const fastapiExists = await window.electronAPI.fileExists(`${this.projectPath}/main.py`);

    if (djangoExists) {
      framework = 'Django';
      command = 'python manage.py runserver';
      port = 8000;
    } else if (fastapiExists) {
      framework = 'FastAPI';
      command = 'uvicorn main:app --reload';
      port = 8000;
    } else if (flaskExists) {
      framework = 'Flask';
      command = 'python app.py';
      port = 5000;
    }

    return {
      type: 'python',
      framework,
      command,
      port,
      healthCheck: '/health',
      runtime: 'python',
    };
  }

  async detectJava() {
    const pomExists = await window.electronAPI.fileExists(`${this.projectPath}/pom.xml`);
    const gradleExists = await window.electronAPI.fileExists(`${this.projectPath}/build.gradle`);
    
    if (!pomExists && !gradleExists) return null;

    return {
      type: 'java',
      framework: 'Spring Boot',
      command: pomExists ? 'mvn spring-boot:run' : 'gradle bootRun',
      port: 8080,
      healthCheck: '/actuator/health',
      runtime: 'java',
    };
  }

  async detectGo() {
    const goModExists = await window.electronAPI.fileExists(`${this.projectPath}/go.mod`);
    if (!goModExists) return null;

    return {
      type: 'go',
      framework: 'Go',
      command: 'go run main.go',
      port: 8080,
      healthCheck: '/health',
      runtime: 'go',
    };
  }

  async detectRuby() {
    const gemfileExists = await window.electronAPI.fileExists(`${this.projectPath}/Gemfile`);
    if (!gemfileExists) return null;

    const configRuExists = await window.electronAPI.fileExists(`${this.projectPath}/config.ru`);
    const framework = configRuExists ? 'Rails' : 'Ruby';

    return {
      type: 'ruby',
      framework,
      command: framework === 'Rails' ? 'rails server' : 'ruby app.rb',
      port: 3000,
      healthCheck: '/health',
      runtime: 'ruby',
    };
  }

  async detectPHP() {
    const composerExists = await window.electronAPI.fileExists(`${this.projectPath}/composer.json`);
    if (!composerExists) return null;

    return {
      type: 'php',
      framework: 'PHP',
      command: 'php -S localhost:8000',
      port: 8000,
      healthCheck: '/health',
      runtime: 'php',
    };
  }

  async detectDotNet() {
    const csprojFiles = await this.findFiles('*.csproj');
    if (csprojFiles.length === 0) return null;

    return {
      type: 'dotnet',
      framework: '.NET',
      command: 'dotnet run',
      port: 5000,
      healthCheck: '/health',
      runtime: 'dotnet',
    };
  }

  async detectDocker() {
    const dockerfileExists = await window.electronAPI.fileExists(`${this.projectPath}/Dockerfile`);
    const composeExists = await window.electronAPI.fileExists(`${this.projectPath}/docker-compose.yml`);
    
    if (!dockerfileExists && !composeExists) return null;

    return {
      type: 'docker',
      framework: composeExists ? 'Docker Compose' : 'Docker',
      command: composeExists ? 'docker-compose up' : 'docker build -t app . && docker run -p 3000:3000 app',
      port: 3000,
      healthCheck: '/health',
      runtime: 'docker',
      useDocker: true,
    };
  }

  async findFiles(pattern) {
    // Simplified - would need proper glob implementation
    return [];
  }
}

export default BackendDetector;
