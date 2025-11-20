class BackendRunner {
  constructor(backend, projectPath, context) {
    this.backend = backend;
    this.projectPath = projectPath;
    this.context = context;
    this.processId = null;
    this.status = 'stopped';
    this.logs = [];
    this.healthCheckInterval = null;
  }

  async start() {
    if (this.status === 'running') return;

    this.status = 'starting';
    this.context?.addLog({ type: 'info', message: `Starting ${this.backend.framework} backend...` });

    try {
      const [cmd, ...args] = this.backend.command.split(' ');
      this.processId = `backend-${Date.now()}`;
      
      // Listen to output
      const outputHandler = (data) => {
        if (data.id === this.processId) {
          this.addLog({ type: data.type === 'stderr' ? 'error' : 'info', message: data.data });
        }
      };
      
      window.electronAPI.on('command-output', outputHandler);
      
      await window.electronAPI.spawnCommand(cmd, args, this.projectPath, this.processId);
      
      // Wait for startup
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start health checks
      this.startHealthCheck();
      
      this.status = 'running';
      this.context?.addLog({ type: 'success', message: `Backend running on port ${this.backend.port}` });
      
      return { success: true, port: this.backend.port };
    } catch (error) {
      this.status = 'error';
      this.context?.addLog({ type: 'error', message: `Failed to start backend: ${error.message}` });
      throw error;
    }
  }

  async stop() {
    if (this.status === 'stopped') return;

    this.stopHealthCheck();
    
    if (this.processId) {
      await window.electronAPI.killCommand(this.processId);
    }
    
    this.status = 'stopped';
    this.context?.addLog({ type: 'info', message: 'Backend stopped' });
  }

  async restart() {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start();
  }

  startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:${this.backend.port}${this.backend.healthCheck}`);
        if (response.ok) {
          this.status = 'healthy';
        } else {
          this.status = 'unhealthy';
        }
      } catch (error) {
        if (this.status === 'running') {
          this.status = 'unhealthy';
        }
      }
    }, 5000);
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  getStatus() {
    return {
      status: this.status,
      port: this.backend.port,
      framework: this.backend.framework,
      processId: this.processId,
      logs: this.logs,
    };
  }

  addLog(log) {
    this.logs.push({
      timestamp: Date.now(),
      ...log,
    });
    
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }
}

export default BackendRunner;
