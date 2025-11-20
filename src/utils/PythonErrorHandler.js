// Python Error Detection and Auto-Fix System
export const PYTHON_LIBRARIES = {
  // Web Frameworks
  django: { install: 'pip install django', manager: 'pip' },
  flask: { install: 'pip install flask', manager: 'pip' },
  fastapi: { install: 'pip install fastapi uvicorn', manager: 'pip' },
  pyramid: { install: 'pip install pyramid', manager: 'pip' },
  tornado: { install: 'pip install tornado', manager: 'pip' },
  
  // Data Science & ML
  numpy: { install: 'pip install numpy', manager: 'pip' },
  pandas: { install: 'pip install pandas', manager: 'pip' },
  matplotlib: { install: 'pip install matplotlib', manager: 'pip' },
  seaborn: { install: 'pip install seaborn', manager: 'pip' },
  scikit_learn: { install: 'pip install scikit-learn', manager: 'pip', importName: 'sklearn' },
  tensorflow: { install: 'pip install tensorflow', manager: 'pip' },
  keras: { install: 'pip install keras', manager: 'pip' },
  pytorch: { install: 'pip install torch torchvision', manager: 'pip', importName: 'torch' },
  scipy: { install: 'pip install scipy', manager: 'pip' },
  
  // Database
  sqlalchemy: { install: 'pip install sqlalchemy', manager: 'pip' },
  pymongo: { install: 'pip install pymongo', manager: 'pip' },
  psycopg2: { install: 'pip install psycopg2-binary', manager: 'pip' },
  mysql_connector: { install: 'pip install mysql-connector-python', manager: 'pip' },
  redis: { install: 'pip install redis', manager: 'pip' },
  
  // API & HTTP
  requests: { install: 'pip install requests', manager: 'pip' },
  httpx: { install: 'pip install httpx', manager: 'pip' },
  aiohttp: { install: 'pip install aiohttp', manager: 'pip' },
  beautifulsoup4: { install: 'pip install beautifulsoup4', manager: 'pip', importName: 'bs4' },
  selenium: { install: 'pip install selenium', manager: 'pip' },
  
  // Testing
  pytest: { install: 'pip install pytest', manager: 'pip' },
  unittest: { install: 'built-in', manager: 'built-in' },
  mock: { install: 'pip install mock', manager: 'pip' },
  coverage: { install: 'pip install coverage', manager: 'pip' },
  
  // Utilities
  python_dotenv: { install: 'pip install python-dotenv', manager: 'pip', importName: 'dotenv' },
  pillow: { install: 'pip install pillow', manager: 'pip', importName: 'PIL' },
  pyyaml: { install: 'pip install pyyaml', manager: 'pip', importName: 'yaml' },
  click: { install: 'pip install click', manager: 'pip' },
  celery: { install: 'pip install celery', manager: 'pip' },
  
  // Async
  asyncio: { install: 'built-in', manager: 'built-in' },
  aiofiles: { install: 'pip install aiofiles', manager: 'pip' },
};

export const PYTHON_ERROR_PATTERNS = [
  {
    pattern: /ModuleNotFoundError: No module named '([^']+)'/,
    type: 'MISSING_MODULE',
    extract: (match) => match[1],
    fix: (module) => {
      const lib = PYTHON_LIBRARIES[module] || PYTHON_LIBRARIES[module.replace('-', '_')];
      return {
        command: lib?.install || `pip install ${module}`,
        message: `Installing missing module: ${module}`,
        nextStep: 'retry'
      };
    }
  },
  {
    pattern: /ImportError: cannot import name '([^']+)' from '([^']+)'/,
    type: 'IMPORT_ERROR',
    extract: (match) => ({ name: match[1], module: match[2] }),
    fix: (data) => ({
      command: `pip install --upgrade ${data.module}`,
      message: `Upgrading ${data.module} to fix import error`,
      nextStep: 'retry'
    })
  },
  {
    pattern: /pip: command not found|'pip' is not recognized/,
    type: 'PIP_NOT_FOUND',
    fix: () => ({
      command: 'python -m ensurepip --upgrade',
      message: 'Installing pip...',
      nextStep: 'retry'
    })
  },
  {
    pattern: /python: command not found|'python' is not recognized/,
    type: 'PYTHON_NOT_FOUND',
    fix: () => ({
      message: 'Python is not installed. Please install Python from https://python.org',
      error: true,
      downloadUrl: 'https://www.python.org/downloads/'
    })
  },
  {
    pattern: /requirements.txt: No such file or directory/,
    type: 'NO_REQUIREMENTS',
    fix: () => ({
      message: 'No requirements.txt found. Skipping dependency installation.',
      nextStep: 'skip'
    })
  },
  {
    pattern: /ERROR: Could not find a version that satisfies the requirement ([^\s]+)/,
    type: 'VERSION_NOT_FOUND',
    extract: (match) => match[1],
    fix: (pkg) => ({
      command: `pip install ${pkg.split('==')[0]}`,
      message: `Installing ${pkg} without version constraint`,
      nextStep: 'retry'
    })
  },
  {
    pattern: /PermissionError|Permission denied/,
    type: 'PERMISSION_ERROR',
    fix: () => ({
      command: 'pip install --user -r requirements.txt',
      message: 'Retrying with --user flag to avoid permission issues',
      nextStep: 'retry'
    })
  },
  {
    pattern: /SyntaxError: invalid syntax/,
    type: 'SYNTAX_ERROR',
    fix: () => ({
      message: 'Syntax error detected in Python code. Please check your code.',
      error: true
    })
  },
  {
    pattern: /django.core.exceptions.ImproperlyConfigured/,
    type: 'DJANGO_CONFIG_ERROR',
    fix: () => ({
      command: 'python manage.py migrate',
      message: 'Running Django migrations...',
      nextStep: 'migrate'
    })
  },
  {
    pattern: /No module named 'venv'/,
    type: 'VENV_NOT_FOUND',
    fix: () => ({
      command: 'python -m pip install virtualenv',
      message: 'Installing virtualenv...',
      nextStep: 'retry'
    })
  }
];

export class PythonErrorHandler {
  constructor(context) {
    this.context = context;
    this.commandHistory = [];
    this.errorCount = 0;
  }

  analyzeError(errorOutput) {
    for (const pattern of PYTHON_ERROR_PATTERNS) {
      const match = errorOutput.match(pattern.pattern);
      if (match) {
        const extracted = pattern.extract ? pattern.extract(match) : null;
        const fix = pattern.fix(extracted);
        
        return {
          type: pattern.type,
          detected: extracted,
          fix,
          originalError: match[0]
        };
      }
    }
    
    return null;
  }

  async handleError(errorOutput, projectPath) {
    this.errorCount++;
    
    if (this.errorCount > 5) {
      return {
        success: false,
        message: 'Too many errors. Please check your project configuration.',
        shouldStop: true
      };
    }

    const analysis = this.analyzeError(errorOutput);
    
    if (!analysis) {
      return {
        success: false,
        message: 'Unknown error occurred',
        shouldRetry: false
      };
    }

    if (analysis.fix.error) {
      return {
        success: false,
        message: analysis.fix.message,
        downloadUrl: analysis.fix.downloadUrl,
        shouldStop: true
      };
    }

    this.context?.addLog({
      type: 'warning',
      message: `🔍 Detected: ${analysis.type} - ${analysis.originalError}`
    });

    this.context?.addLog({
      type: 'info',
      message: `🔧 ${analysis.fix.message}`
    });

    if (analysis.fix.command) {
      this.commandHistory.push(analysis.fix.command);
      
      return {
        success: true,
        command: analysis.fix.command,
        nextStep: analysis.fix.nextStep,
        message: analysis.fix.message
      };
    }

    return {
      success: true,
      nextStep: analysis.fix.nextStep,
      message: analysis.fix.message
    };
  }

  reset() {
    this.errorCount = 0;
    this.commandHistory = [];
  }

  getCommandHistory() {
    return this.commandHistory;
  }
}
