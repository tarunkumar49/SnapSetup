import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import FeedbackModal from './FeedbackModal';
import './Footer.css';

function Footer() {
  const { project, systemChecks, runningServers, runningProcessId, setRunningProcessId, setRunningServers } = useProject();
  const [showFeedback, setShowFeedback] = useState(false);

  const handleOpenFrontend = () => {
    if (!runningServers.frontend) return;
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(runningServers.frontend);
    } else {
      window.open(runningServers.frontend, '_blank');
    }
  };

  const handleOpenBackend = () => {
    if (!runningServers.backend) return;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(runningServers.backend);
    } else {
      window.open(runningServers.backend, '_blank');
    }
  };

  const handleStopProject = async () => {
    if (!runningProcessId) return;
    try {
      if (window.electronAPI && window.electronAPI.killCommand) {
        await window.electronAPI.killCommand(runningProcessId);
      } else {
        // no-op if kill not available
      }
      setRunningProcessId(null);
      setRunningServers({ frontend: null, backend: null });
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="footer">
      <div className="footer-left">
        <div className="footer-item">
          <span className="label">Project:</span>
          <span className="value">{project?.name || 'None'}</span>
        </div>
        <div className="footer-item">
          <span className="label">Node:</span>
          <span className={`value ${systemChecks.node === false ? 'error' : ''}`}>
            {systemChecks.node === null ? 'Checking...' : systemChecks.node || 'Not installed'}
          </span>
        </div>
      </div>

      <div className="footer-center">
        {runningServers.frontend && (
          <div className="footer-item">
            <div className="clickable" onClick={handleOpenFrontend}>
              <span className="label">Frontend:</span>
              <span className="value link">{runningServers.frontend}</span>
            </div>
            <button className="stop-btn" onClick={handleStopProject}>Stop</button>
          </div>
        )}
      </div>

      <div className="footer-right">
        {runningServers.backend && (
          <div className="footer-item">
            <div className="clickable" onClick={handleOpenBackend}>
              <span className="label">Backend:</span>
              <span className="value link">{runningServers.backend}</span>
            </div>
          </div>
        )}
        <div className="footer-item">
          <span className="label">Docker:</span>
          <span className={`value ${systemChecks.docker ? 'available' : ''}`}>
            {systemChecks.docker === null ? 'Checking...' : systemChecks.docker ? 'Available' : 'Not available'}
          </span>
        </div>
        <button className="feedback-btn" onClick={() => setShowFeedback(true)} title="Send Feedback">
          💬 Feedback
        </button>
      </div>
      
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
}

export default Footer;
