import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Terminal from './components/Terminal';
import AIAgent from './components/AIAgent';
import EditorArea from './components/EditorArea';
import Toast from './components/Toast';
import FeedbackModal from './components/FeedbackModal';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { useFileWatcher } from './hooks/useFileWatcher';
import './App.css';

function AppContent() {
  const { setupStatus } = useProject();
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [aiAgentWidth, setAiAgentWidth] = useState(350);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [terminalWidth, setTerminalWidth] = useState(window.innerWidth - 200);
  const [isElectron, setIsElectron] = useState(false);
  const [activeResize, setActiveResize] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  useFileWatcher();

  useEffect(() => {
    document.body.className = 'dark';
    setIsElectron(!!window.electronAPI);
  }, []);

  useEffect(() => {
    if (setupStatus === 'completed') {
      const hasShownFeedback = localStorage.getItem('feedbackShown');
      if (!hasShownFeedback) {
        setTimeout(() => {
          setShowFeedback(true);
          localStorage.setItem('feedbackShown', 'true');
        }, 2000);
      }
    }
  }, [setupStatus]);

  const handleSidebarResize = (e) => {
    e.preventDefault();
    setActiveResize('sidebar');
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMouseMove = (e) => {
      const newWidth = startWidth + (e.clientX - startX);
      if (newWidth >= 150 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };
    const onMouseUp = () => {
      setActiveResize(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleAiAgentResize = (e) => {
    e.preventDefault();
    setActiveResize('ai');
    const startX = e.clientX;
    const startWidth = aiAgentWidth;
    const onMouseMove = (e) => {
      const newWidth = startWidth - (e.clientX - startX);
      if (newWidth >= 250 && newWidth <= 600) {
        setAiAgentWidth(newWidth);
      }
    };
    const onMouseUp = () => {
      setActiveResize(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleTerminalResize = (e) => {
    e.preventDefault();
    setActiveResize('terminal');
    const startY = e.clientY;
    const startHeight = terminalHeight;
    const onMouseMove = (e) => {
      const newHeight = startHeight - (e.clientY - startY);
      if (newHeight >= 100 && newHeight <= 600) {
        setTerminalHeight(newHeight);
      }
    };
    const onMouseUp = () => {
      setActiveResize(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleTerminalWidthResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = terminalWidth;
    const onMouseMove = (e) => {
      const newWidth = startWidth + (e.clientX - startX);
      const maxWidth = window.innerWidth - aiAgentWidth - 50;
      if (newWidth >= 300 && newWidth <= maxWidth) {
        setTerminalWidth(newWidth);
      }
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="vscode-app">
      <Header />
      <div className={`vscode-body ${activeResize ? `resizing-${activeResize}` : ''}`}>
        <div className="grid-left-section">
          <div className="grid-top-section">
            <div className="grid-sidebar" style={{ width: sidebarWidth }}>
              <Sidebar />
              <div className={`resize-handle resize-handle-right ${activeResize === 'sidebar' ? 'active' : ''}`} onMouseDown={handleSidebarResize} />
            </div>
            <div className="grid-editor">
              <EditorArea />
              <div className={`resize-handle resize-handle-bottom ${activeResize === 'terminal' ? 'active' : ''}`} onMouseDown={handleTerminalResize} />
            </div>
          </div>
          <div className="grid-terminal" style={{ height: terminalHeight }}>
            <Terminal />
          </div>
        </div>
        <div className="grid-right-section" style={{ width: aiAgentWidth }}>
          <div className={`resize-handle resize-handle-left ${activeResize === 'ai' ? 'active' : ''}`} onMouseDown={handleAiAgentResize} />
          <div className="grid-chat">
            <AIAgent mode="chat" />
          </div>
          <div className="grid-actions" style={{ height: terminalHeight }}>
            <div className={`resize-handle resize-handle-top resize-handle-sync ${activeResize === 'terminal' ? 'active' : ''}`} onMouseDown={handleTerminalResize} />
            <AIAgent mode="actions" />
          </div>
        </div>
      </div>
      <Toast />
      <Settings />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
}

function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}

export default App;
