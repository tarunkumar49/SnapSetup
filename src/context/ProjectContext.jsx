import React, { createContext, useContext, useState, useEffect } from 'react';

const ProjectContext = createContext();

export function useProject() {
  return useContext(ProjectContext);
}

export function ProjectProvider({ children }) {
  const [project, setProject] = useState(null);
  const [projectPath, setProjectPath] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [dependencies, setDependencies] = useState([]);
  const [backends, setBackends] = useState([]);
  const [activeBackend, setActiveBackend] = useState(null);
  const [backendRunner, setBackendRunner] = useState(null);
  const [installProgress, setInstallProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [logs, setLogs] = useState([]);
  const [setupStatus, setSetupStatus] = useState('idle'); // idle, analyzing, checking, installing, running, completed, error
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [runningServers, setRunningServers] = useState({ frontend: null, backend: null });
  const [runningProcessId, setRunningProcessId] = useState(null);
  const [systemChecks, setSystemChecks] = useState({ node: null, npm: null, docker: null });
  const [toasts, setToasts] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [settings, setSettings] = useState({
    theme: 'dark',
    useSystemTerminal: false,
    defaultShell: 'powershell',
    aiAgentEnabled: true,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsFileName = 'ai-codebase-setup-settings.json';

  // Load settings from disk (userData path)
  const loadSettings = async () => {
    try {
      if (!window.electronAPI) return;
      const userData = await window.electronAPI.getUserDataPath();
      if (!userData) return;
      const settingsPath = `${userData}/${settingsFileName}`;
      const result = await window.electronAPI.readFile(settingsPath);
      if (result.success) {
        const parsed = JSON.parse(result.content);
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      // ignore
    }
  };

  // Save settings to disk
  const saveSettings = async (newSettings) => {
    try {
      if (!window.electronAPI) {
        setSettings(newSettings);
        return;
      }
      const userData = await window.electronAPI.getUserDataPath();
      if (!userData) {
        setSettings(newSettings);
        return;
      }
      const settingsPath = `${userData}/${settingsFileName}`;
      await window.electronAPI.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
      setSettings(newSettings);
    } catch (err) {
      // fallback to memory
      setSettings(newSettings);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Add log entry
  const addLog = (entry) => {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    setLogs((prev) => [...prev, logEntry]);
  };

  // Add terminal output
  const addTerminalOutput = (output) => {
    setTerminalOutput((prev) => [...prev, {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...output,
    }]);
  };

  // Clear terminal
  const clearTerminal = () => {
    setTerminalOutput([]);
  };

  // Show toast
  const showToast = (message, type = 'info') => {
    const toast = {
      id: Date.now(),
      message,
      type,
    };
    setToasts((prev) => [...prev, toast]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 5000);
  };

  // Remove toast
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load project
  const loadProject = async (path) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      
      setProjectPath(path);
      setSetupStatus('analyzing');
      addLog({ type: 'info', message: `Loading project from ${path}` });

      // Detect backends
      const BackendDetector = (await import('../utils/BackendDetector')).default;
      const detector = new BackendDetector(path);
      const detectedBackends = await detector.detectBackends();
      setBackends(detectedBackends);
      if (detectedBackends.length > 0) {
        addLog({ type: 'success', message: `Detected ${detectedBackends.length} backend(s)` });
      }
      
      // Detect language first
      let langDetection;
      try {
        langDetection = await detectProjectLanguage(path);
      } catch (err) {
        console.error('Language detection error:', err);
        langDetection = { lang: 'unknown', manager: null };
      }
      
      if (langDetection.lang === 'nodejs') {
        // Node.js project
        try {
          const pkgJsonPath = `${path}/package.json`;
          const pkgResult = await window.electronAPI.readFile(pkgJsonPath);
          
          if (pkgResult.success) {
            const packageJson = JSON.parse(pkgResult.content);
            setProject(packageJson);
            
            const projectAnalysis = await analyzeProject(path, packageJson);
            setAnalysis(projectAnalysis);
            
            const deps = extractDependencies(packageJson);
            setDependencies(deps);
            setInstallProgress({ current: 0, total: deps.length, percentage: 0 });
            
            addLog({ type: 'success', message: 'Node.js project loaded successfully' });
            showToast('Project loaded successfully', 'success');
            setSetupStatus('idle');
            
            return { success: true, analysis: projectAnalysis };
          }
        } catch (err) {
          console.error('Error loading Node.js project:', err);
          addLog({ type: 'warning', message: 'Error parsing package.json, loading as generic project' });
        }
      }
      
      if (langDetection && langDetection.lang && langDetection.lang !== 'unknown') {
        // Other language project
        const projectInfo = {
          name: path.split(/[\\/]/).pop(),
          language: langDetection.lang,
          manager: langDetection.manager,
          isDocker: langDetection.isDocker || false,
        };
        setProject(projectInfo);
        
        const projectAnalysis = {
          name: projectInfo.name,
          type: langDetection.lang,
          stack: [langDetection.lang, langDetection.manager].filter(Boolean),
          language: langDetection.lang,
          manager: langDetection.manager,
          isDocker: langDetection.isDocker || false,
        };
        setAnalysis(projectAnalysis);
        setDependencies([]);
        
        addLog({ type: 'success', message: `${langDetection.lang} project loaded successfully` });
        showToast(`${langDetection.lang} project detected`, 'success');
        setSetupStatus('idle');
        
        return { success: true, analysis: projectAnalysis };
      } else {
        // Unknown project
        const projectInfo = {
          name: path.split(/[\\/]/).pop(),
          language: 'Unknown',
        };
        setProject(projectInfo);
        
        const projectAnalysis = {
          name: projectInfo.name,
          type: 'unknown',
          stack: [],
        };
        setAnalysis(projectAnalysis);
        setDependencies([]);
        
        addLog({ type: 'warning', message: 'Could not detect project type' });
        showToast('Unknown project type', 'warning');
        setSetupStatus('idle');
        
        return { success: true, analysis: projectAnalysis };
      }
    } catch (error) {
      addLog({ type: 'error', message: `Failed to load project: ${error.message}` });
      showToast(`Failed to load project: ${error.message}`, 'error');
      setSetupStatus('error');
      return { success: false, error: error.message };
    }
  };

  // Detect project language
  const detectProjectLanguage = async (path) => {
    try {
      // Check for Docker first
      const hasDockerfile = await window.electronAPI.fileExists(`${path}/Dockerfile`);
      const hasDockerCompose = await window.electronAPI.fileExists(`${path}/docker-compose.yml`);
      
      if (hasDockerfile || hasDockerCompose) {
        return { lang: 'Docker', manager: hasDockerCompose ? 'docker-compose' : 'docker', isDocker: true };
      }

      const checks = [
        { file: 'package.json', lang: 'nodejs', manager: 'npm' },
        { file: 'requirements.txt', lang: 'Python', manager: 'pip' },
        { file: 'Pipfile', lang: 'Python', manager: 'pipenv' },
        { file: 'pyproject.toml', lang: 'Python', manager: 'poetry' },
        { file: 'pom.xml', lang: 'Java', manager: 'maven' },
        { file: 'build.gradle', lang: 'Java', manager: 'gradle' },
        { file: 'go.mod', lang: 'Go', manager: 'go' },
        { file: 'Cargo.toml', lang: 'Rust', manager: 'cargo' },
        { file: 'composer.json', lang: 'PHP', manager: 'composer' },
        { file: 'Gemfile', lang: 'Ruby', manager: 'bundler' },
        { file: 'mix.exs', lang: 'Elixir', manager: 'mix' },
      ];

      for (const check of checks) {
        try {
          const exists = await window.electronAPI.fileExists(`${path}/${check.file}`);
          if (exists) return check;
        } catch (err) {
          console.error(`Error checking ${check.file}:`, err);
        }
      }
    } catch (err) {
      console.error('Error in detectProjectLanguage:', err);
    }
    
    return { lang: 'unknown', manager: null };
  };

  // Analyze project
  const analyzeProject = async (path, packageJson) => {
    const analysis = {
      name: packageJson?.name || 'Unknown',
      type: 'unknown',
      stack: [],
      ports: [],
      hasDockerCompose: false,
      hasEnvExample: false,
      hasEnv: false,
      scripts: packageJson?.scripts || {},
      nodeVersion: packageJson?.engines?.node || null,
      isMonorepo: false,
      hasBackend: false,
      hasFrontend: false,
      hasDatabase: false,
    };

    if (!packageJson) return analysis;

    // Detect project type
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Frontend frameworks
    if (deps.react || deps['react-dom']) analysis.stack.push('React');
    if (deps.next) analysis.stack.push('Next.js');
    if (deps.vite) analysis.stack.push('Vite');
    if (deps.vue) analysis.stack.push('Vue');
    
    // Backend frameworks
    if (deps.express) analysis.stack.push('Express');
    if (deps.fastify) analysis.stack.push('Fastify');
    if (deps['@nestjs/core']) analysis.stack.push('NestJS');
    if (deps.koa) analysis.stack.push('Koa');
    
    // Databases
    if (deps.mongodb || deps.mongoose) analysis.stack.push('MongoDB');
    if (deps.pg) analysis.stack.push('PostgreSQL');
    if (deps.mysql || deps.mysql2) analysis.stack.push('MySQL');
    
    // Detect backend
    analysis.hasBackend = analysis.stack.some(s => ['Express', 'Fastify', 'NestJS', 'Koa'].includes(s));
    
    // Detect frontend
    analysis.hasFrontend = analysis.stack.some(s => ['React', 'Next.js', 'Vite', 'Vue'].includes(s));
    
    // Detect database
    analysis.hasDatabase = analysis.stack.some(s => ['MongoDB', 'PostgreSQL', 'MySQL'].includes(s));
    
    // Detect type
    if (analysis.hasBackend && analysis.hasFrontend) {
      analysis.type = 'fullstack';
    } else if (analysis.hasBackend) {
      analysis.type = 'backend';
    } else if (analysis.hasFrontend) {
      analysis.type = 'frontend';
    }

    // Check for monorepo structure
    try {
      const clientExists = await window.electronAPI.fileExists(`${path}/client/package.json`);
      const serverExists = await window.electronAPI.fileExists(`${path}/server/package.json`);
      const frontendExists = await window.electronAPI.fileExists(`${path}/frontend/package.json`);
      const backendExists = await window.electronAPI.fileExists(`${path}/backend/package.json`);
      
      analysis.isMonorepo = clientExists || serverExists || frontendExists || backendExists;

      // Check for files
      const dockerComposeExists = await window.electronAPI.fileExists(`${path}/docker-compose.yml`);
      const envExampleExists = await window.electronAPI.fileExists(`${path}/.env.example`);
      const envExists = await window.electronAPI.fileExists(`${path}/.env`);
      
      analysis.hasDockerCompose = dockerComposeExists;
      analysis.hasEnvExample = envExampleExists;
      analysis.hasEnv = envExists;
    } catch (err) {
      console.error('Error checking project structure:', err);
    }

    // Detect ports (common defaults)
    if (analysis.stack.includes('Next.js')) analysis.ports.push(3000);
    if (analysis.stack.includes('Vite')) analysis.ports.push(5173);
    if (analysis.stack.includes('Express') || analysis.hasBackend) analysis.ports.push(5000);
    if (analysis.stack.includes('React') && !analysis.stack.includes('Next.js') && !analysis.stack.includes('Vite')) {
      analysis.ports.push(3000);
    }

    return analysis;
  };

  // Extract dependencies
  const extractDependencies = (packageJson) => {
    const deps = [];
    
    try {
      if (packageJson?.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          deps.push({ name, version, type: 'production', status: 'pending' });
        });
      }
      
      if (packageJson?.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
          deps.push({ name, version, type: 'dev', status: 'pending' });
        });
      }
    } catch (err) {
      console.error('Error extracting dependencies:', err);
    }
    
    return deps;
  };

  // Update dependency status
  const updateDependencyStatus = (name, status, error = null) => {
    setDependencies((prev) => {
      const updated = prev.map((dep) =>
        dep.name === name ? { ...dep, status, error } : dep
      );
      
      // Update progress
      const installed = updated.filter((d) => d.status === 'installed').length;
      const failed = updated.filter((d) => d.status === 'failed').length;
      const installing = updated.filter((d) => d.status === 'installing').length;
      const total = updated.length;
      const percentage = Math.round(((installed + failed) / total) * 100);
      
      setInstallProgress({ 
        current: installed + failed, 
        total, 
        percentage,
        installed,
        failed,
        installing: installing > 0 ? updated.find((d) => d.status === 'installing')?.name : null,
      });
      
      return updated;
    });
  };

  // Batch update dependencies
  const updateDependencies = (updates) => {
    setDependencies((prev) => {
      const updated = prev.map((dep) => {
        const update = updates.find((u) => u.name === dep.name);
        return update ? { ...dep, ...update } : dep;
      });
      
      // Update progress
      const installed = updated.filter((d) => d.status === 'installed').length;
      const failed = updated.filter((d) => d.status === 'failed').length;
      const total = updated.length;
      const percentage = Math.round(((installed + failed) / total) * 100);
      
      setInstallProgress({ 
        current: installed + failed, 
        total, 
        percentage,
        installed,
        failed,
      });
      
      return updated;
    });
  };

  const value = {
    project,
    projectPath,
    analysis,
    dependencies,
    installProgress,
    logs,
    setupStatus,
    terminalOutput,
    runningServers,
    runningProcessId,
    systemChecks,
    toasts,
    showLogs,
    backends,
    activeBackend,
    backendRunner,
    setProject,
    setProjectPath,
    setAnalysis,
    setDependencies,
    setSetupStatus,
    setRunningServers,
    setRunningProcessId,
    setSystemChecks,
    setShowLogs,
    setBackends,
    setActiveBackend,
    setBackendRunner,
    loadProject,
    addLog,
    addTerminalOutput,
    clearTerminal,
    showToast,
    removeToast,
    settings,
    saveSettings,
    settingsOpen,
    setSettingsOpen,
    updateDependencyStatus,
    updateDependencies,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
