import AgentExecutor from './AgentExecutor';

class AgentActions {
  constructor(projectPath, context) {
    this.executor = new AgentExecutor(projectPath, context);
    this.projectPath = projectPath;
  }

  async checkNodeJS() {
    return await this.executor.checkCommand('node', 'Node.js', 'https://nodejs.org/');
  }

  async checkPython() {
    return await this.executor.checkCommand('python', 'Python', 'https://www.python.org/downloads/');
  }

  async checkJava() {
    return await this.executor.checkCommand('java', 'Java JDK', 'https://www.oracle.com/java/technologies/downloads/');
  }

  async checkGo() {
    return await this.executor.checkCommand('go', 'Go', 'https://go.dev/dl/');
  }

  async checkRust() {
    return await this.executor.checkCommand('cargo', 'Rust', 'https://www.rust-lang.org/tools/install');
  }

  async checkPHP() {
    return await this.executor.checkCommand('php', 'PHP', 'https://www.php.net/downloads');
  }

  async checkRuby() {
    return await this.executor.checkCommand('ruby', 'Ruby', 'https://www.ruby-lang.org/en/downloads/');
  }

  async checkElixir() {
    return await this.executor.checkCommand('elixir', 'Elixir', 'https://elixir-lang.org/install.html');
  }

  async checkDocker() {
    await this.executor.checkCommand('docker', 'Docker', 'https://www.docker.com/products/docker-desktop');
    
    // Check if Docker is running
    this.executor.log('Checking if Docker Desktop is running...', 'info');
    try {
      await this.executor.runCommand('docker', ['ps']);
    } catch (err) {
      const error = new Error('Docker Desktop is not running. Please start Docker Desktop.');
      error.code = 'DOCKER_NOT_RUNNING';
      throw error;
    }
    this.executor.log('✅ Docker Desktop is running', 'success');
  }

  async checkEnvFile() {
    const envPath = `${this.projectPath}/.env`;
    const envExamplePath = `${this.projectPath}/.env.example`;

    const envExists = await this.executor.fileExists(envPath);
    if (envExists) {
      this.executor.log('✅ .env file exists', 'success');
      return true;
    }

    const envExampleExists = await this.executor.fileExists(envExamplePath);
    if (envExampleExists) {
      this.executor.log('Creating .env from .env.example...', 'info');
      const content = await this.executor.readFile(envExamplePath);
      await this.executor.writeFile(envPath, content);
      this.executor.log('✅ .env file created', 'success');
      return true;
    }

    this.executor.log('ℹ️ No .env.example found, skipping .env creation', 'info');
    return false;
  }

  async installNodeDeps() {
    this.executor.log('📦 Installing Node.js dependencies...', 'info');
    await this.executor.runCommand('npm', ['install']);
    await this.executor.waitForPath(`${this.projectPath}/node_modules`);
    await this.executor.wait(2000);
    this.executor.log('✅ Node.js dependencies installed', 'success');
  }

  async installPythonDeps(manager = 'pip') {
    this.executor.log(`📦 Installing Python dependencies with ${manager}...`, 'info');
    
    const commands = {
      pip: ['pip', ['install', '-r', 'requirements.txt']],
      pipenv: ['pipenv', ['install']],
      poetry: ['poetry', ['install']],
    };

    const [cmd, args] = commands[manager];
    await this.executor.runCommand(cmd, args);
    await this.executor.wait(3000);
    this.executor.log('✅ Python dependencies installed', 'success');
  }

  async buildJavaProject(manager = 'maven') {
    this.executor.log(`📦 Building Java project with ${manager}...`, 'info');
    
    const commands = {
      maven: ['mvn', ['clean', 'install']],
      gradle: ['gradle', ['build']],
    };

    const [cmd, args] = commands[manager];
    await this.executor.runCommand(cmd, args);
    
    const checkPath = manager === 'maven' ? 'target' : 'build';
    await this.executor.waitForPath(`${this.projectPath}/${checkPath}`);
    this.executor.log('✅ Java project built', 'success');
  }

  async installGoDeps() {
    this.executor.log('📦 Installing Go dependencies...', 'info');
    await this.executor.runCommand('go', ['mod', 'download']);
    await this.executor.wait(3000);
    this.executor.log('✅ Go dependencies installed', 'success');
  }

  async buildRustProject() {
    this.executor.log('📦 Building Rust project...', 'info');
    await this.executor.runCommand('cargo', ['build']);
    await this.executor.waitForPath(`${this.projectPath}/target`);
    this.executor.log('✅ Rust project built', 'success');
  }

  async installPHPDeps() {
    this.executor.log('📦 Installing PHP dependencies...', 'info');
    await this.executor.runCommand('composer', ['install']);
    await this.executor.waitForPath(`${this.projectPath}/vendor`);
    this.executor.log('✅ PHP dependencies installed', 'success');
  }

  async installRubyDeps() {
    this.executor.log('📦 Installing Ruby gems...', 'info');
    await this.executor.runCommand('bundle', ['install']);
    await this.executor.wait(3000);
    this.executor.log('✅ Ruby gems installed', 'success');
  }

  async installElixirDeps() {
    this.executor.log('📦 Installing Elixir dependencies...', 'info');
    await this.executor.runCommand('mix', ['deps.get']);
    await this.executor.waitForPath(`${this.projectPath}/deps`);
    this.executor.log('✅ Elixir dependencies installed', 'success');
  }

  async startNodeServer() {
    const pkgContent = await this.executor.readFile(`${this.projectPath}/package.json`);
    const pkg = JSON.parse(pkgContent);
    
    const scriptName = pkg.scripts?.dev ? 'dev' : pkg.scripts?.start ? 'start' : null;
    if (!scriptName) {
      this.executor.log('⚠️ No start/dev script found', 'warning');
      return;
    }

    this.executor.log(`🚀 Starting server (npm run ${scriptName})...`, 'info');
    await this.executor.runCommand('npm', ['run', scriptName]);
    await this.executor.wait(3000);
    this.executor.log('✅ Server started', 'success');
  }

  async runDockerCompose() {
    this.executor.log('🐳 Running docker-compose up...', 'info');
    await this.executor.runCommand('docker-compose', ['up', '--build', '-d']);
    await this.executor.wait(5000);
    this.executor.log('✅ Docker containers started', 'success');
  }

  async runDockerfile() {
    this.executor.log('🐳 Building Docker image...', 'info');
    await this.executor.runCommand('docker', ['build', '-t', 'app', '.']);
    await this.executor.wait(2000);
    
    this.executor.log('🚀 Running Docker container...', 'info');
    await this.executor.runCommand('docker', ['run', '-d', '-p', '3000:3000', 'app']);
    await this.executor.wait(2000);
    this.executor.log('✅ Docker container running', 'success');
  }
}

export default AgentActions;
