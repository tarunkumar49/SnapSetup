import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import './Sidebar.css';

function Sidebar() {
  const { project, projectPath, analysis, showToast, setSettingsOpen, loadProject } = useProject();
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [activeSection, setActiveSection] = useState('explorer');

  useEffect(() => {
    if (projectPath) {
      loadFiles();
    }
  }, [projectPath]);

  const loadFiles = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.readDirectory(projectPath);
    if (result.success) {
      setFiles(result.entries);
    }
  };

  const toggleFolder = (path) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap = {
      'js': '📄',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'json': '📋',
      'md': '📝',
      'css': '🎨',
      'html': '🌐',
      'py': '🐍',
      'yml': '⚙️',
      'yaml': '⚙️',
      'env': '🔐',
      'gitignore': '🚫',
      'dockerfile': '🐳'
    };
    return iconMap[ext] || '📄';
  };

  const renderFileTree = () => {
    const directories = files.filter(f => f.type === 'directory');
    const regularFiles = files.filter(f => f.type === 'file' && !f.path.includes('/'));

    return (
      <div className="file-tree">
        {directories.map((dir) => (
          <div key={dir.path} className="file-tree-item">
            <div
              className="file-tree-row directory"
              onClick={() => toggleFolder(dir.path)}
            >
              <span className="expand-icon">
                {expandedFolders.has(dir.path) ? '▼' : '▶'}
              </span>
              <span className="folder-icon">📁</span>
              <span className="file-name">{dir.name}</span>
            </div>
          </div>
        ))}
        {regularFiles.map((file) => (
          <div key={file.path} className="file-tree-item">
            <div className="file-tree-row file">
              <span className="file-icon">{getFileIcon(file.name)}</span>
              <span className="file-name">{file.name}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="vscode-sidebar">
      <div className="activity-bar">
        <div 
          className={`activity-item ${activeSection === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveSection('explorer')}
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14.5 2H7.71l-.85-.85L6.51 1h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 2zm-.51 8.49V13h-12V7h4.49l.35-.15.86-.86H14v1.5l-.01 4.99z"/>
          </svg>
        </div>
        <div 
          className={`activity-item ${activeSection === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveSection('settings')}
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.2.7-2.4.5v1.2l2.4.5.3.8-1.3 2 .8.8 2-1.3.8.3.4 2.3h1.2l.5-2.4.8-.3 2 1.3.8-.8-1.3-2 .3-.8 2.3-.4V7.4l-2.4-.5-.3-.8 1.3-2-.8-.8-2 1.3-.7-.2zM9.4 1l.5 2.4L12 2.1l2 2-1.4 2.1 2.4.4v2.8l-2.4.5L14 12l-2 2-2.1-1.4-.5 2.4H6.6l-.5-2.4L4 13.9l-2-2 1.4-2.1L1 9.4V6.6l2.4-.5L2.1 4l2-2 2.1 1.4.4-2.4h2.8zm.6 7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM8 9c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z"/>
          </svg>
        </div>
        <div className="activity-spacer"></div>
      </div>

      <div className="sidebar-content">
        {activeSection === 'explorer' && (
          <>
            <div className="section-header">
              <span className="section-title">EXPLORER</span>
            </div>
            
            {project ? (
              <div className="explorer-content">
                <div className="project-folder">
                  <div className="folder-header">
                    <span className="expand-icon">▼</span>
                    <span className="folder-name">{project.name}</span>
                  </div>
                  {renderFileTree()}
                </div>
              </div>
            ) : (
              <div className="no-project">
                <p>No folder opened</p>
                <button className="open-folder-btn" onClick={async () => {
                  if (!window.electronAPI) return;
                  const path = await window.electronAPI.selectFolder();
                  if (path) await loadProject(path);
                }}>Open Folder</button>
              </div>
            )}
          </>
        )}

        {activeSection === 'settings' && (
          <>
            <div className="section-header">
              <span className="section-title">SETTINGS</span>
            </div>
            
            <div className="settings-content">
              <div className="setting-item" onClick={() => setSettingsOpen(true)}>
                <span className="setting-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.2.7-2.4.5v1.2l2.4.5.3.8-1.3 2 .8.8 2-1.3.8.3.4 2.3h1.2l.5-2.4.8-.3 2 1.3.8-.8-1.3-2 .3-.8 2.3-.4V7.4l-2.4-.5-.3-.8 1.3-2-.8-.8-2 1.3-.7-.2zM9.4 1l.5 2.4L12 2.1l2 2-1.4 2.1 2.4.4v2.8l-2.4.5L14 12l-2 2-2.1-1.4-.5 2.4H6.6l-.5-2.4L4 13.9l-2-2 1.4-2.1L1 9.4V6.6l2.4-.5L2.1 4l2-2 2.1 1.4.4-2.4h2.8zm.6 7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM8 9c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z"/>
                  </svg>
                </span>
                <span className="setting-label">Preferences</span>
              </div>
              
              {analysis && (
                <div className="project-info">
                  <h4>Project Info</h4>
                  <div className="info-item">
                    <span className="info-label">Type:</span>
                    <span className="info-value">{analysis.type}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Stack:</span>
                    <span className="info-value">{analysis.stack.join(', ')}</span>
                  </div>
                  {analysis.ports.length > 0 && (
                    <div className="info-item">
                      <span className="info-label">Ports:</span>
                      <span className="info-value">{analysis.ports.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
