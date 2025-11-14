import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Terminal from './components/Terminal';
import AIAgent from './components/AIAgent';
import EditorArea from './components/EditorArea';
import Toast from './components/Toast';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { useFileWatcher } from './hooks/useFileWatcher';
import './App.css';

function AppContent() {
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [aiAgentWidth, setAiAgentWidth] = useState(350);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [isElectron, setIsElectron] = useState(false);
  
  useFileWatcher();

  useEffect(() => {
    document.body.className = 'dark';
    setIsElectron(!!window.electronAPI);
  }, []);

  const handleSidebarResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMouseMove = (e) => {
      const newWidth = startWidth + (e.clientX - startX);
      if (newWidth < 50) {
        setSidebarWidth(0);
      } else if (newWidth >= 150 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      } else if (newWidth >= 50 && newWidth < 150) {
        setSidebarWidth(150);
      }
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleAiAgentResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = aiAgentWidth;
    const onMouseMove = (e) => {
      const newWidth = startWidth - (e.clientX - startX);
      if (newWidth < 50) {
        setAiAgentWidth(0);
      } else if (newWidth >= 250 && newWidth <= 600) {
        setAiAgentWidth(newWidth);
      } else if (newWidth >= 50 && newWidth < 250) {
        setAiAgentWidth(250);
      }
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleTerminalResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = terminalHeight;
    const onMouseMove = (e) => {
      const newHeight = startHeight - (e.clientY - startY);
      if (newHeight < 50) {
        setTerminalHeight(0);
      } else if (newHeight >= 100 && newHeight <= 600) {
        setTerminalHeight(newHeight);
      } else if (newHeight >= 50 && newHeight < 100) {
        setTerminalHeight(100);
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
      <div className="vscode-body">
        {sidebarWidth === 0 ? (
          <div className="resize-handle resize-handle-edge-left" onMouseDown={(e) => {
            e.preventDefault();
            setSidebarWidth(250);
          }} />
        ) : (
          <div style={{ width: sidebarWidth, position: 'relative' }}>
            <Sidebar />
            <div className="resize-handle resize-handle-right" onMouseDown={handleSidebarResize} />
          </div>
        )}
        <div className="vscode-main">
          <EditorArea />
          {aiAgentWidth === 0 ? (
            <div className="resize-handle resize-handle-edge-right" onMouseDown={(e) => {
              e.preventDefault();
              setAiAgentWidth(350);
            }} />
          ) : (
            <div style={{ width: aiAgentWidth, position: 'relative' }}>
              <div className="resize-handle resize-handle-left" onMouseDown={handleAiAgentResize} />
              <AIAgent />
            </div>
          )}
        </div>
      </div>
      {terminalHeight === 0 ? (
        <div className="resize-handle resize-handle-edge-bottom" onMouseDown={(e) => {
          e.preventDefault();
          setTerminalHeight(250);
        }} />
      ) : (
        <div style={{ height: terminalHeight, position: 'relative' }}>
          <div className="resize-handle resize-handle-top" onMouseDown={handleTerminalResize} />
          <Terminal />
        </div>
      )}
      <div className="app-footer">
        <span>SnapSetup v1.0.0</span>
        <span>AI-Powered JavaScript Setup Automation</span>
      </div>
      <Toast />
      <Settings />
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
