import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import SetupManager from '../utils/SetupManager';
import HybridAIAgent from '../utils/HybridAIAgent';
import './AIAgent.css';

function AIAgent({ mode: propMode }) {
  const projectContext = useProject();
  const {
    project,
    projectPath,
    analysis,
    dependencies,
    installProgress,
    setupStatus,
    systemChecks,
    runningServers,
    showToast,
    addLog,
    setSystemChecks,
  } = projectContext;
  const { settings } = projectContext;

  const mode = propMode || 'actions';
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [llmStatus, setLlmStatus] = useState(null);
  const messagesEndRef = useRef(null);
  const setupManager = useRef(null);
  const hybridAgent = useRef(null);

  useEffect(() => {
    if (projectPath && !setupManager.current) {
      setupManager.current = new SetupManager(projectPath, projectContext);
    }
    if (!hybridAgent.current) {
      // Get Groq API key from environment or settings
      const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || settings?.groqApiKey || '';
      hybridAgent.current = new HybridAIAgent(projectContext, groqApiKey);
      hybridAgent.current.initialize().then(() => {
        const status = hybridAgent.current.getAIStatus();
        setLlmStatus(status);
      });
    }
  }, [projectPath, projectContext, settings]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add initial message when project is loaded
    if (project && analysis && messages.length === 0) {
      let message = `Hey — I analyzed your project. `;
      
      if (analysis.type === 'fullstack') {
        message += `I detected a fullstack application with ${analysis.stack.join(', ')}. `;
        if (analysis.hasDatabase) {
          message += `Database detected! I'll auto-generate docker-compose.yml and start everything in the right order. `;
        }
        message += `Click "Start Auto Setup" to install and run both backend and frontend.`;
      } else {
        message += `I detected ${analysis.type} with ${analysis.stack.join(', ')}. `;
        message += `I found ${dependencies.length} dependencies. Click "Start Auto Setup" to begin installation.`;
      }
      
      addAgentMessage(message, 'greeting');
    }
  }, [project, analysis]);

  if (settings && settings.aiAgentEnabled === false) {
    return (
      <div className="ai-agent-panel">
        <div className="ai-agent-header">
          <div className="ai-agent-title">⚡ Snap - AI (Disabled)</div>
        </div>
        <div className="ai-agent-content">
          <p>Snap - AI is disabled in Settings. Enable it to access setup automation and chat features.</p>
        </div>
      </div>
    );
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addAgentMessage = (text, type = 'info') => {
    const messageId = `${Date.now()}-${Math.random()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        sender: 'agent',
        text: '',
        fullText: text,
        type,
        timestamp: new Date().toISOString(),
        isTyping: true,
      },
    ]);

    // Typing animation
    let currentIndex = 0;
    const typingSpeed = 50; // milliseconds per character
    const typingInterval = setInterval(() => {
      currentIndex++;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                text: text.substring(0, currentIndex),
                isTyping: currentIndex < text.length,
              }
            : msg
        )
      );
      if (currentIndex >= text.length) {
        clearInterval(typingInterval);
      }
    }, typingSpeed);
  };

  const addUserMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        sender: 'user',
        text,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleStartSetup = async () => {
    if (!setupManager.current) return;
    
    setIsProcessing(true);
    addAgentMessage('Starting setup process... Let me check your system first.', 'info');
    addLog({ type: 'info', message: 'Starting automated setup process' });
    
    try {
      // Run system checks first
      addAgentMessage('🔍 Checking system requirements...', 'info');
      const sysChecks = await setupManager.current.runSystemChecks();
      setSystemChecks(sysChecks);
      
      if (!sysChecks.node) {
        addAgentMessage(
          '⚠️ Node.js not found. Please install Node.js from the official site: https://nodejs.org/',
          'error'
        );
        showToast('Node.js not found. Please install it to continue.', 'error');
        setIsProcessing(false);
        return;
      }
      
      addAgentMessage(`✅ Node.js detected: ${sysChecks.node}`, 'success');
      addLog({ type: 'success', message: `Node.js version: ${sysChecks.node}` });
      
      // Check .env
      addAgentMessage('🔐 Checking environment files...', 'info');
      const envCheck = await setupManager.current.checkEnvFile();
      if (envCheck && envCheck.created) {
        addAgentMessage(
          '✅ .env file created with placeholders. Please review and update with your actual values.',
          'info'
        );
        showToast('.env file created with placeholders', 'warning');
      }
      
      // Show different messages based on project type
      if (analysis?.type === 'fullstack') {
        addAgentMessage('🚀 Fullstack project detected! Starting sequential setup...', 'info');
        addAgentMessage('📦 Step 1: Installing dependencies (check terminal for progress)', 'info');
        if (analysis.hasDatabase) {
          addAgentMessage('🐳 Step 2: Starting database containers', 'info');
        }
        addAgentMessage('🔧 Step 3: Starting backend server', 'info');
        addAgentMessage('⚙️ Step 4: Starting frontend dev server', 'info');
      } else {
        addAgentMessage(`📦 Installing dependencies... Check the terminal below for real-time progress.`, 'info');
      }
      
      addLog({ type: 'info', message: 'Starting setup process...' });
      const setupResult = await setupManager.current.runFullSetup();
      addLog({ type: 'info', message: `Setup result: ${JSON.stringify(setupResult)}` });
      
      addAgentMessage('✅ Setup completed successfully! 🎉', 'success');
      if (runningServers.frontend || runningServers.backend) {
        addAgentMessage('Your servers are running! Check the footer for URLs.', 'success');
      }
      showToast('Setup completed successfully!', 'success');
      addLog({ type: 'success', message: 'Setup completed successfully' });
    } catch (error) {
      addAgentMessage(`❌ Setup failed: ${error.message}`, 'error');
      addLog({ type: 'error', message: `Setup failed: ${error.message}` });
      showToast(`Setup failed: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async () => {
    showToast('Retrying failed installations...', 'info');
    if (!setupManager.current) return;
    try {
      const result = await setupManager.current.installDependenciesWithProgress();
      if (result && result.failed === 0) {
        showToast('Retry completed', 'success');
      } else {
        showToast(`Retry completed with ${result.failed} failures`, 'warning');
      }
    } catch (err) {
      showToast(`Retry failed: ${err.message}`, 'error');
    }
  };

  const handleGenerateDockerCompose = async () => {
    if (!setupManager.current) return;
    
    addAgentMessage('Generating docker-compose.yml...', 'info');
    try {
      const result = await setupManager.current.generateDockerCompose();
      if (result.success) {
        addAgentMessage('Docker compose file generated! Check the preview in the actions panel.', 'success');
      }
    } catch (error) {
      addAgentMessage(`Failed to generate docker-compose: ${error.message}`, 'error');
    }
  };

  const handleOpenNodeSite = () => {
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal('https://nodejs.org/en/');
    } else {
      window.open('https://nodejs.org/en/', '_blank');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !hybridAgent.current) return;

    const messageToSend = inputValue.trim();
    addUserMessage(messageToSend);
    setInputValue('');
    setIsProcessing(true);

    try {
      // Get current context
      const currentContext = {
        project,
        projectPath,
        analysis,
        dependencies,
        setupStatus,
        logs: projectContext.logs || [],
        runningServers,
        systemChecks,
      };

      // Get response from hybrid agent
      const response = await hybridAgent.current.chat(messageToSend, currentContext);
      
      // Add agent response
      addAgentMessage(response.message, 'info');

      // Execute actions if any
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          await executeAction(action);
        }
      }
    } catch (error) {
      addAgentMessage(`Error: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeAction = async (action) => {
    try {
      switch (action.type) {
        case 'start_setup':
          await handleStartSetup();
          break;
        case 'retry':
          await handleRetry();
          break;
        case 'generate_docker':
          await handleGenerateDockerCompose();
          break;
        case 'create_env':
          if (setupManager.current) {
            await setupManager.current.checkEnvFile();
            addAgentMessage('.env file created successfully', 'success');
          }
          break;
        case 'suggestion':
          addAgentMessage(`💡 Suggestion: ${action.text}`, 'info');
          break;
        default:
          console.log('Unknown action:', action);
      }
    } catch (error) {
      addAgentMessage(`Failed to execute action: ${error.message}`, 'error');
    }
  };

  const renderActions = () => {
    if (!project) {
      return (
        <div className="no-project-message">
          <p>Upload a project to get started</p>
        </div>
      );
    }

    return (
      <div className="actions-panel">
        <div className="action-section">
          <h4>Setup Status</h4>
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className={`status-badge ${setupStatus}`}>
              {setupStatus === 'installing' && '⌛ '}
              {setupStatus === 'running' && '✅ '}
              {setupStatus === 'completed' && '🎉 '}
              {setupStatus === 'error' && '❌ '}
              {setupStatus}
            </span>
          </div>
          {setupStatus === 'installing' && (
            <div className="activity-indicator">
              <div className="spinner"></div>
              <span>Installing dependencies... Check terminal for progress</span>
            </div>
          )}
          {installProgress.total > 0 && (
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${installProgress.percentage}%` }}
                />
              </div>
              <div className="progress-text">
                {installProgress.current} / {installProgress.total} ({installProgress.percentage}%)
              </div>
            </div>
          )}
        </div>

        <div className="action-section">
          <h4>Actions</h4>
          <button
            onClick={handleStartSetup}
            disabled={isProcessing || setupStatus === 'installing' || setupStatus === 'running'}
            className="action-button primary"
          >
            {setupStatus === 'installing' && 'Installing...'}
            {setupStatus === 'running' && 'Running...'}
            {(setupStatus === 'idle' || setupStatus === 'completed') && 'Start Auto Setup'}
            {setupStatus === 'error' && 'Retry Setup'}
          </button>
          
          <button
            onClick={handleRetry}
            disabled={isProcessing}
            className="action-button"
          >
            Retry Failed
          </button>

          {analysis?.hasDockerCompose === false && (
            <button
              onClick={handleGenerateDockerCompose}
              disabled={isProcessing}
              className="action-button"
            >
              Generate docker-compose.yml
            </button>
          )}

          {systemChecks.node === false && (
            <button
              onClick={handleOpenNodeSite}
              className="action-button warning"
            >
              ⚠️ Install Node.js
            </button>
          )}
        </div>



        {dependencies.length > 0 && (
          <div className="action-section">
            <h4>Dependencies ({dependencies.length})</h4>
            <div className="dependency-list">
              {dependencies.slice(0, 10).map((dep) => (
                <div key={dep.name} className="dependency-item">
                  <span className={`dep-status ${dep.status}`}>
                    {dep.status === 'pending' && '⏳'}
                    {dep.status === 'installing' && '⚙️'}
                    {dep.status === 'installed' && '✅'}
                    {dep.status === 'failed' && '❌'}
                  </span>
                  <span className="dep-name">{dep.name}</span>
                </div>
              ))}
              {dependencies.length > 10 && (
                <div className="dep-more">
                  +{dependencies.length - 10} more...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderChat = () => {
    return (
      <div className="chat-panel">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.sender} ${msg.type || ''}`}
            >
              <div className="message-content">
                <div className={`message-text ${msg.isTyping ? 'typing' : ''}`}>{msg.text}</div>
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask me anything or give instructions..."
          />
          <button onClick={handleSendMessage} disabled={!inputValue.trim()}>
            Send
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="ai-agent">
      <div className="ai-agent-header">
        <div className="section-title">{mode === 'chat' ? 'CHAT' : 'ACTIONS'}</div>
      </div>
      <div className="ai-agent-content">
        {mode === 'actions' ? renderActions() : renderChat()}
      </div>
    </div>
  );
}

export default AIAgent;
