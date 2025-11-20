class AgentMemory {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem('autonomous-agent-memory');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.error('Failed to load memory:', err);
    }

    return {
      projects: [],
      errorSolutions: {},
      commandPatterns: {},
      successRate: {},
      lastUpdated: Date.now(),
    };
  }

  save() {
    try {
      this.data.lastUpdated = Date.now();
      localStorage.setItem('autonomous-agent-memory', JSON.stringify(this.data));
    } catch (err) {
      console.error('Failed to save memory:', err);
    }
  }

  recordProject(projectData) {
    this.data.projects.push({
      ...projectData,
      timestamp: Date.now(),
    });

    if (this.data.projects.length > 100) {
      this.data.projects = this.data.projects.slice(-100);
    }

    this.save();
  }

  findSimilarProject(language, manager) {
    return this.data.projects
      .filter(p => p.success && p.language === language && p.manager === manager)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  recordError(errorKey, context) {
    if (!this.data.errorSolutions[errorKey]) {
      this.data.errorSolutions[errorKey] = {
        occurrences: 0,
        solutions: [],
        contexts: [],
      };
    }

    this.data.errorSolutions[errorKey].occurrences++;
    this.data.errorSolutions[errorKey].contexts.push({
      ...context,
      timestamp: Date.now(),
    });

    this.save();
  }

  recordSolution(errorKey, solution, success) {
    if (!this.data.errorSolutions[errorKey]) {
      this.data.errorSolutions[errorKey] = {
        occurrences: 0,
        solutions: [],
        contexts: [],
      };
    }

    this.data.errorSolutions[errorKey].solutions.push({
      solution,
      success,
      timestamp: Date.now(),
    });

    this.save();
  }

  getSolution(errorKey) {
    const errorData = this.data.errorSolutions[errorKey];
    if (!errorData || !errorData.solutions.length) return null;

    const successfulSolutions = errorData.solutions.filter(s => s.success);
    if (successfulSolutions.length > 0) {
      return successfulSolutions[successfulSolutions.length - 1].solution;
    }

    return null;
  }

  updateSuccessRate(action, success) {
    if (!this.data.successRate[action]) {
      this.data.successRate[action] = { success: 0, total: 0 };
    }

    this.data.successRate[action].total++;
    if (success) {
      this.data.successRate[action].success++;
    }

    this.save();
  }

  getSuccessRate(action) {
    const data = this.data.successRate[action];
    if (!data || data.total === 0) return 0;
    return (data.success / data.total) * 100;
  }

  clear() {
    this.data = {
      projects: [],
      errorSolutions: {},
      commandPatterns: {},
      successRate: {},
      lastUpdated: Date.now(),
    };
    this.save();
  }
}

export default AgentMemory;
