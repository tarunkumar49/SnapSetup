// Edge Case Handler for Complex Scenarios
export const EDGE_CASES = {
  // Network Issues
  NETWORK_TIMEOUT: {
    patterns: [/ETIMEDOUT/, /ENOTFOUND/, /network timeout/i],
    fix: 'retry',
    message: 'Network timeout. Retrying...',
    delay: 5000
  },
  
  // Disk Space
  NO_SPACE: {
    patterns: [/ENOSPC/, /no space left/i],
    fix: null,
    message: 'No disk space. Free up space and try again.',
    error: true
  },
  
  // Memory Issues
  OUT_OF_MEMORY: {
    patterns: [/JavaScript heap out of memory/, /OutOfMemoryError/],
    fix: 'NODE_OPTIONS=--max-old-space-size=4096',
    message: 'Increasing memory limit...',
    env: true
  },
  
  // Corrupted Cache
  CORRUPTED_CACHE: {
    patterns: [/integrity check failed/, /sha.*mismatch/i],
    fix: 'npm cache clean --force && npm install',
    message: 'Cleaning corrupted cache...'
  },
  
  // Lock File Issues
  LOCK_FILE_CONFLICT: {
    patterns: [/lock file.*conflict/, /ELOCKVERIFY/],
    fix: 'rm package-lock.json && npm install',
    message: 'Resolving lock file conflict...'
  },
  
  // Port Already in Use
  PORT_IN_USE: {
    patterns: [/EADDRINUSE.*:(\d+)/],
    fix: 'npx kill-port $1',
    message: 'Killing process on port $1...',
    extract: true
  },
  
  // SSL/Certificate Issues
  SSL_ERROR: {
    patterns: [/certificate/, /SSL/, /CERT_/],
    fix: 'npm config set strict-ssl false',
    message: 'Disabling SSL verification...'
  },
  
  // Proxy Issues
  PROXY_ERROR: {
    patterns: [/proxy/, /tunneling socket/i],
    fix: 'npm config delete proxy && npm config delete https-proxy',
    message: 'Removing proxy configuration...'
  },
  
  // Python Virtual Environment
  VENV_ACTIVATION: {
    patterns: [/activate.*cannot be loaded/, /execution.*disabled/],
    fix: 'Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser',
    message: 'Enabling script execution...',
    windows: true
  },
  
  // Docker Not Running
  DOCKER_NOT_RUNNING: {
    patterns: [/Cannot connect to.*Docker daemon/, /docker.*not running/i],
    fix: null,
    message: 'Start Docker Desktop and try again.',
    error: true
  },
  
  // Git Issues
  GIT_CONFLICT: {
    patterns: [/git.*conflict/, /CONFLICT.*merge/],
    fix: null,
    message: 'Resolve git conflicts manually.',
    error: true
  },
  
  // File Permission Issues
  PERMISSION_DENIED: {
    patterns: [/EACCES/, /permission denied/i, /Access is denied/],
    fix: 'sudo',
    message: 'Permission denied. Run with elevated privileges.',
    requiresAdmin: true
  },
  
  // Symlink Issues
  SYMLINK_ERROR: {
    patterns: [/EPERM.*symlink/, /symbolic link/i],
    fix: 'npm install --no-bin-links',
    message: 'Installing without symlinks...'
  },
  
  // Python 2 vs 3
  PYTHON_VERSION: {
    patterns: [/SyntaxError.*print/, /python2.*python3/i],
    fix: 'python3 -m pip install -r requirements.txt',
    message: 'Using Python 3...'
  },
  
  // Node Version Mismatch
  NODE_VERSION: {
    patterns: [/engine.*node/, /requires node/i],
    fix: null,
    message: 'Node version mismatch. Check package.json engines.',
    error: true
  },
  
  // Missing Build Tools
  BUILD_TOOLS: {
    patterns: [/gyp.*not found/, /MSBuild.*not found/, /make.*not found/],
    fix: null,
    message: 'Install build tools for your platform.',
    error: true
  }
};

export class EdgeCaseHandler {
  constructor(context) {
    this.context = context;
    this.handledCases = new Set();
  }

  async handle(errorOutput, projectPath) {
    for (const [caseName, caseData] of Object.entries(EDGE_CASES)) {
      for (const pattern of caseData.patterns) {
        const match = errorOutput.match(pattern);
        if (match) {
          if (this.handledCases.has(caseName)) {
            continue;
          }

          this.handledCases.add(caseName);
          this.context?.addLog({ type: 'warning', message: `⚠️ Edge case: ${caseName}` });

          if (caseData.error) {
            return { success: false, message: caseData.message, shouldStop: true };
          }

          let command = caseData.fix;
          let message = caseData.message;

          if (caseData.extract && match[1]) {
            command = command.replace('$1', match[1]);
            message = message.replace('$1', match[1]);
          }

          this.context?.addLog({ type: 'info', message: `🔧 ${message}` });

          if (caseData.delay) {
            await new Promise(resolve => setTimeout(resolve, caseData.delay));
          }

          return {
            success: true,
            command,
            message,
            nextStep: caseData.fix === 'retry' ? 'retry' : 'execute'
          };
        }
      }
    }

    return null;
  }

  reset() {
    this.handledCases.clear();
  }
}
