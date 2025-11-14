import React from 'react';
import { useProject } from '../context/ProjectContext';
import Logo from './Logo';
import './Header.css';

function Header() {
  const { loadProject, showToast, setSettingsOpen, project } = useProject();

  const handleUploadProject = async () => {
    if (!window.electronAPI) {
      showToast('This feature requires Electron', 'error');
      return;
    }
    const path = await window.electronAPI.selectFolder();
    if (path) {
      const result = await loadProject(path);
      if (!result.success) {
        showToast(`Failed to load project: ${result.error}`, 'error');
      }
    }
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleHelp = () => {
    const url = 'https://github.com/yourusername/snapsetup#readme';
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  return (
    <div className="vscode-header">
      <div className="menu-bar">
        <div className="menu-item" onClick={handleUploadProject}>File</div>
        <div className="menu-item" onClick={handleOpenSettings}>Edit</div>
        <div className="menu-item" onClick={handleOpenSettings}>View</div>
        <div className="menu-item" onClick={() => showToast('Terminal is already visible below', 'info')}>Terminal</div>
        <div className="menu-item" onClick={handleHelp}>Help</div>
      </div>
      
      <div className="title-bar">
        <Logo size={20} showText={false} />
        <span className="app-title">
          {project ? `SnapSetup - ${project.name}` : 'SnapSetup'}
        </span>
      </div>
      
      <div className="window-controls">
        <button className="window-btn minimize" onClick={handleMinimize}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M0,5 L10,5" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
        <button className="window-btn maximize" onClick={handleMaximize}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
        <button className="window-btn close" onClick={handleClose}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default Header;
