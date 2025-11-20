import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import './BackendPanel.css';

function BackendPanel({ backend, runner }) {
  const { showToast } = useProject();
  const [status, setStatus] = useState({ status: 'stopped' });
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!runner) return;
    
    const interval = setInterval(() => {
      setStatus(runner.getStatus());
      setLogs([...runner.logs]);
    }, 500);

    return () => clearInterval(interval);
  }, [runner]);

  const handleStart = async () => {
    if (!runner) {
      showToast('Backend runner not initialized', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      await runner.start();
      showToast('Backend started', 'success');
    } catch (error) {
      showToast(`Failed to start: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    if (!runner) return;
    
    setIsLoading(true);
    try {
      await runner.stop();
      showToast('Backend stopped', 'info');
    } catch (error) {
      showToast(`Failed to stop: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!runner) return;
    
    setIsLoading(true);
    try {
      await runner.restart();
      showToast('Backend restarted', 'success');
    } catch (error) {
      showToast(`Failed to restart: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBrowser = () => {
    const url = `http://localhost:${backend.port}`;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'running':
      case 'healthy':
        return '#10b981';
      case 'starting':
        return '#f59e0b';
      case 'unhealthy':
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="backend-panel">
      <div className="backend-header">
        <div className="backend-info">
          <h3>{backend.framework}</h3>
          <div className="backend-status" style={{ color: getStatusColor() }}>
            ● {status.status || 'stopped'}
          </div>
        </div>
        <div className="backend-controls">
          <button onClick={handleStart} disabled={status.status === 'running' || isLoading}>
            {isLoading ? '...' : '▶ Start'}
          </button>
          <button onClick={handleStop} disabled={status.status === 'stopped' || isLoading}>
            ■ Stop
          </button>
          <button onClick={handleRestart} disabled={status.status === 'stopped' || isLoading}>
            ↻ Restart
          </button>
        </div>
      </div>

      <div className="backend-details">
        <div className="detail-row">
          <span>Port:</span>
          <span>
            {backend.port}
            {status.status === 'running' && (
              <button onClick={handleOpenBrowser} className="open-browser-btn">
                🌐 Open
              </button>
            )}
          </span>
        </div>
        <div className="detail-row">
          <span>Command:</span>
          <code>{backend.command}</code>
        </div>
        <div className="detail-row">
          <span>Health Check:</span>
          <span>{backend.healthCheck}</span>
        </div>
      </div>

      <div className="backend-logs">
        <div className="logs-header">
          <h4>Logs</h4>
          <button onClick={() => setLogs([])}>Clear</button>
        </div>
        <div className="logs-content">
          {logs.length === 0 ? (
            <div className="no-logs">No logs yet</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`log-entry ${log.type}`}>
                <span className="log-time">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default BackendPanel;
