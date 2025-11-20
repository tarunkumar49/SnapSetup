import AgentMemory from './AgentMemory';
import AgentActions from './AgentActions';

class AdvancedAutonomousAgent {
  constructor(context) {
    this.context = context;
    this.memory = new AgentMemory();
    this.actions = null;
    this.taskQueue = [];
    this.currentTask = null;
    this.retryCount = {};
    this.maxRetries = 3;
    this.setupStartTime = null;
  }

  log(message, type = 'info') {
    this.context?.addLog({ type, message });
  }

  async analyze(projectPath, analysis) {
    this.log('🤖 Autonomous agent analyzing project...', 'info');
    
    const similar = this.memory.findSimilarProject(analysis.language, analysis.manager);
    if (similar) {
      this.log(`💡 Found similar ${analysis.language} project in memory`, 'info');
      return similar.plan;
    }

    const plan = this.createPlan(analysis);
    this.log(`📋 Created plan with ${plan.length} steps`, 'info');
    return plan;
  }

  createPlan(analysis) {
    const plan = [];

    if (analysis.isDocker) {
      plan.push({ action: 'checkDocker', params: {} });
      if (analysis.manager === 'docker-compose') {
        plan.push({ action: 'runDockerCompose', params: {} });
      } else {
        plan.push({ action: 'runDockerfile', params: {} });
      }
      return plan;
    }

    switch (analysis.language) {
      case 'nodejs':
        plan.push({ action: 'checkNodeJS', params: {} });
        plan.push({ action: 'checkEnvFile', params: {} });
        plan.push({ action: 'installNodeDeps', params: {} });
        plan.push({ action: 'startNodeServer', params: {} });
        break;

      case 'Python':
        plan.push({ action: 'checkPython', params: {} });
        plan.push({ action: 'installPythonDeps', params: { manager: analysis.manager } });
        break;

      case 'Java':
        plan.push({ action: 'checkJava', params: {} });
        plan.push({ action: 'buildJavaProject', params: { manager: analysis.manager } });
        break;

      case 'Go':
        plan.push({ action: 'checkGo', params: {} });
        plan.push({ action: 'installGoDeps', params: {} });
        break;

      case 'Rust':
        plan.push({ action: 'checkRust', params: {} });
        plan.push({ action: 'buildRustProject', params: {} });
        break;

      case 'PHP':
        plan.push({ action: 'checkPHP', params: {} });
        plan.push({ action: 'installPHPDeps', params: {} });
        break;

      case 'Ruby':
        plan.push({ action: 'checkRuby', params: {} });
        plan.push({ action: 'installRubyDeps', params: {} });
        break;

      case 'Elixir':
        plan.push({ action: 'checkElixir', params: {} });
        plan.push({ action: 'installElixirDeps', params: {} });
        break;
    }

    return plan;
  }

  async execute(projectPath, analysis) {
    this.setupStartTime = Date.now();
    this.actions = new AgentActions(projectPath, this.context);
    
    this.log('🚀 Starting autonomous setup...', 'info');
    this.context?.setSetupStatus('installing');

    try {
      const plan = await this.analyze(projectPath, analysis);
      this.taskQueue = [...plan];

      while (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift();
        this.currentTask = task;

        try {
          await this.executeTask(task);
          this.memory.updateSuccessRate(task.action, true);
          this.retryCount[task.action] = 0;
        } catch (error) {
          this.memory.updateSuccessRate(task.action, false);
          await this.handleError(task, error, analysis);
        }
      }

      const duration = Math.round((Date.now() - this.setupStartTime) / 1000);
      this.log(`✅ Setup completed in ${duration}s`, 'success');
      
      this.memory.recordProject({
        language: analysis.language,
        manager: analysis.manager,
        plan: plan,
        success: true,
        duration,
      });

      this.context?.setSetupStatus('completed');
      return { success: true };

    } catch (error) {
      this.log(`❌ Setup failed: ${error.message}`, 'error');
      
      this.memory.recordProject({
        language: analysis.language,
        manager: analysis.manager,
        success: false,
        error: error.message,
      });

      this.context?.setSetupStatus('error');
      throw error;
    }
  }

  async executeTask(task) {
    const { action, params } = task;
    this.log(`⚙️ Executing: ${action}`, 'info');

    const actionMethod = this.actions[action];
    if (!actionMethod) {
      throw new Error(`Unknown action: ${action}`);
    }

    await actionMethod.call(this.actions, ...Object.values(params));
  }

  async handleError(task, error, analysis) {
    const errorKey = `${task.action}-${error.code || error.message}`;
    
    this.log(`⚠️ Error in ${task.action}: ${error.message}`, 'error');
    
    this.memory.recordError(errorKey, {
      task: task.action,
      language: analysis.language,
      manager: analysis.manager,
    });

    if (error.code === 'MISSING_RUNTIME') {
      this.log(`📥 Please install ${error.runtime} from: ${error.downloadUrl}`, 'error');
      const err = new Error(error.message);
      err.downloadUrl = error.downloadUrl;
      err.languageName = error.runtime;
      throw err;
    }

    const retryKey = task.action;
    this.retryCount[retryKey] = (this.retryCount[retryKey] || 0) + 1;

    if (this.retryCount[retryKey] < this.maxRetries) {
      this.log(`🔄 Retrying ${task.action} (${this.retryCount[retryKey]}/${this.maxRetries})...`, 'warning');
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.taskQueue.unshift(task);
      return;
    }

    const solution = this.memory.getSolution(errorKey);
    if (solution) {
      this.log(`💡 Applying learned solution...`, 'info');
      this.taskQueue.unshift(solution);
      return;
    }

    throw error;
  }

  getMemoryStats() {
    return {
      totalProjects: this.memory.data.projects.length,
      successfulProjects: this.memory.data.projects.filter(p => p.success).length,
      knownErrors: Object.keys(this.memory.data.errorSolutions).length,
      knownSolutions: Object.values(this.memory.data.errorSolutions)
        .reduce((sum, e) => sum + e.solutions.length, 0),
    };
  }

  clearMemory() {
    this.memory.clear();
    this.log('🧹 Agent memory cleared', 'info');
  }
}

export default AdvancedAutonomousAgent;
