// Universal Error Handler for All Languages
export class UniversalErrorHandler {
  constructor(context) {
    this.context = context;
    this.errorCount = 0;
    this.maxRetries = 3;
  }

  async handleError(errorOutput, language, projectPath) {
    this.errorCount++;
    
    if (this.errorCount > this.maxRetries) {
      return { success: false, message: 'Max retries reached', shouldStop: true };
    }

    const handlers = {
      nodejs: this.handleNodeError.bind(this),
      python: this.handlePythonError.bind(this),
      java: this.handleJavaError.bind(this),
      go: this.handleGoError.bind(this),
      rust: this.handleRustError.bind(this),
      php: this.handlePHPError.bind(this),
      ruby: this.handleRubyError.bind(this),
      elixir: this.handleElixirError.bind(this),
    };

    const handler = handlers[language];
    if (handler) {
      return await handler(errorOutput, projectPath);
    }

    return { success: false, message: 'Unknown language' };
  }

  handleNodeError(error, path) {
    const patterns = [
      { match: /Cannot find module/, fix: 'npm install', msg: 'Installing missing modules' },
      { match: /EADDRINUSE.*:(\d+)/, fix: 'npx kill-port $1', msg: 'Killing port $1' },
      { match: /peer dep.*missing/, fix: 'npm install --legacy-peer-deps', msg: 'Installing with legacy peer deps' },
      { match: /EACCES/, fix: 'npm install --unsafe-perm', msg: 'Retrying with unsafe-perm' },
      { match: /gyp ERR/, fix: 'npm install --build-from-source', msg: 'Building from source' },
    ];

    return this.matchAndFix(error, patterns);
  }

  handlePythonError(error, path) {
    const patterns = [
      { match: /ModuleNotFoundError.*'([^']+)'/, fix: 'pip install $1', msg: 'Installing $1' },
      { match: /pip.*not found/, fix: 'python -m ensurepip', msg: 'Installing pip' },
      { match: /PermissionError/, fix: 'pip install --user -r requirements.txt', msg: 'Installing with --user' },
      { match: /externally-managed-environment/, fix: 'pip install --break-system-packages -r requirements.txt', msg: 'Installing with --break-system-packages' },
    ];

    return this.matchAndFix(error, patterns);
  }

  handleJavaError(error, path) {
    const patterns = [
      { match: /package.*does not exist/, fix: 'mvn clean install', msg: 'Rebuilding project' },
      { match: /JAVA_HOME/, fix: null, msg: 'Set JAVA_HOME environment variable', error: true },
    ];

    return this.matchAndFix(error, patterns);
  }

  handleGoError(error, path) {
    const patterns = [
      { match: /cannot find package/, fix: 'go mod tidy', msg: 'Tidying modules' },
      { match: /go.sum.*mismatch/, fix: 'go mod verify && go mod tidy', msg: 'Verifying and tidying' },
    ];

    return this.matchAndFix(error, patterns);
  }

  handleRustError(error, path) {
    const patterns = [
      { match: /could not find.*in registry/, fix: 'cargo update', msg: 'Updating dependencies' },
      { match: /linker.*not found/, fix: null, msg: 'Install C++ build tools', error: true },
    ];

    return this.matchAndFix(error, patterns);
  }

  handlePHPError(error, path) {
    const patterns = [
      { match: /Class.*not found/, fix: 'composer dump-autoload', msg: 'Regenerating autoload' },
      { match: /composer.*not found/, fix: null, msg: 'Install Composer', error: true },
    ];

    return this.matchAndFix(error, patterns);
  }

  handleRubyError(error, path) {
    const patterns = [
      { match: /cannot load such file/, fix: 'bundle install', msg: 'Installing gems' },
      { match: /Bundler.*not found/, fix: 'gem install bundler', msg: 'Installing Bundler' },
    ];

    return this.matchAndFix(error, patterns);
  }

  handleElixirError(error, path) {
    const patterns = [
      { match: /\(UndefinedFunctionError\)/, fix: 'mix deps.get', msg: 'Getting dependencies' },
      { match: /mix.*not found/, fix: null, msg: 'Install Elixir', error: true },
    ];

    return this.matchAndFix(error, patterns);
  }

  matchAndFix(error, patterns) {
    for (const pattern of patterns) {
      const match = error.match(pattern.match);
      if (match) {
        let fix = pattern.fix;
        let msg = pattern.msg;
        
        if (fix && match[1]) {
          fix = fix.replace('$1', match[1]);
          msg = msg.replace('$1', match[1]);
        }

        if (pattern.error) {
          return { success: false, message: msg, shouldStop: true };
        }

        this.context?.addLog({ type: 'info', message: `🔧 ${msg}` });
        
        return {
          success: true,
          command: fix,
          message: msg,
          nextStep: 'retry'
        };
      }
    }

    return { success: false, message: 'Unknown error' };
  }

  reset() {
    this.errorCount = 0;
  }
}
