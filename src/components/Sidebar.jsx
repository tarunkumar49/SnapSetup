
import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import BackendPanel from './BackendPanel';
import BackendRunner from '../utils/BackendRunner';
import SystemDependencyChecker from '../utils/SystemDependencyChecker';
import './Sidebar.css';

function BackendSection() {
  const { backends, activeBackend, setActiveBackend, backendRunner, setBackendRunner, projectPath } = useProject();
  const projectContext = useProject();

  useEffect(() => {
    if (backends.length > 0 && !activeBackend) {
      setActiveBackend(backends[0]);
    }
  }, [backends, activeBackend, setActiveBackend]);

  useEffect(() => {
    if (activeBackend && projectPath) {
      const runner = new BackendRunner(activeBackend, projectPath, projectContext);
      setBackendRunner(runner);
    }
    
    return () => {
      if (backendRunner) {
        backendRunner.stop().catch(() => {});
      }
    };
  }, [activeBackend, projectPath]);

  if (backends.length === 0) {
    return (
      <div className="no-backend">
        <p>No backend detected</p>
      </div>
    );
  }

  return (
    <div className="backend-section">
      {backends.length > 1 && (
        <div className="backend-selector">
          <label>Select Backend:</label>
          <select 
            value={backends.indexOf(activeBackend)} 
            onChange={(e) => {
              const newBackend = backends[parseInt(e.target.value)];
              if (backendRunner) {
                backendRunner.stop().catch(() => {});
              }
              setActiveBackend(newBackend);
            }}
          >
            {backends.map((backend, i) => (
              <option key={i} value={i}>
                {backend.framework}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {activeBackend && backendRunner && (
        <BackendPanel backend={activeBackend} runner={backendRunner} />
      )}
    </div>
  );
}

function Sidebar() {
  const projectContext = useProject();
  const { project, projectPath, analysis, showToast, setSettingsOpen, loadProject } = projectContext;
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [activeSection, setActiveSection] = useState('explorer');
  const [availableEditors, setAvailableEditors] = useState([]);
  const [systemDeps, setSystemDeps] = useState(null);
  const [checkingDeps, setCheckingDeps] = useState(false);
  const [installingDep, setInstallingDep] = useState(null);

  useEffect(() => {
    if (projectPath) {
      loadFiles();
    }
  }, [projectPath]);

  useEffect(() => {
    if (window.electronAPI?.detectEditors) {
      window.electronAPI.detectEditors().then(editors => {
        setAvailableEditors(editors);
      });
    }
  }, []);

  const checkSystemDependencies = async () => {
    setCheckingDeps(true);
    const checker = new SystemDependencyChecker(projectContext);
    const result = await checker.checkAll();
    setSystemDeps(result);
    setCheckingDeps(false);
    
    if (result.missing.length > 0) {
      showToast(`${result.missing.length} system dependencies missing`, 'warning');
    } else {
      showToast('All system dependencies installed', 'success');
    }
  };

  const handleInstallDependency = async (depName) => {
    setInstallingDep(depName);
    const checker = new SystemDependencyChecker(projectContext);
    await checker.autoInstall(depName);
    setInstallingDep(null);
    await checkSystemDependencies();
  };

  const handleOpenInEditor = async (editor) => {
    if (!projectPath) {
      showToast('No project loaded', 'error');
      return;
    }
    try {
      if (!window.electronAPI?.openInEditor) {
        showToast('Editor integration not available', 'error');
        return;
      }
      const result = await window.electronAPI.openInEditor(editor.cmd, projectPath);
      if (result.success) {
        showToast(`Opening in ${editor.name}...`, 'success');
      } else {
        showToast(`Failed to open in ${editor.name}: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
      console.error('Error opening editor:', err);
    }
  };

  const loadFiles = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.readDirectory(projectPath);
    if (result.success) {
      const entries = result.entries.map(entry => ({
        ...entry,
        path: entry.name,
        fullPath: entry.path
      }));
      setFiles(entries);
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
    const name = fileName.toLowerCase();
    
    // Special files
    if (name === 'package.json') return <svg width="16" height="16" viewBox="0 0 32 32"><path fill="#cb3837" d="M0 10v12h9.3v2H16v-2h16V10zm9.3 10H7.1V12H5v8H2.5V12h-.7v10h7.5zm6.7-8h-2.2v8H12v2h4.1v-2h-2.2V12zm12.2 8h-2.2v-6H24v6h-2.1v-6h-2.2v6H18v-8h10.2z"/></svg>;
    if (name === '.gitignore') return <svg width="16" height="16" viewBox="0 0 32 32"><path fill="#f05032" d="M29.47 11.93l-13.4-13.4a1.8 1.8 0 0 0-2.54 0l-2.78 2.78 3.53 3.53a2.14 2.14 0 0 1 2.27 2.27l3.4 3.4a2.14 2.14 0 1 1-1.28 1.22l-3.17-3.17v8.35a2.14 2.14 0 1 1-1.71-.08V7.5a2.14 2.14 0 0 1-1.16-2.8L8.1 1.17 1.73 7.53a1.8 1.8 0 0 0 0 2.54l13.4 13.4a1.8 1.8 0 0 0 2.54 0l13.33-13.33a1.8 1.8 0 0 0 .47-2.21z"/></svg>;
    if (name === 'dockerfile') return <svg width="16" height="16" viewBox="0 0 32 32"><path fill="#2496ed" d="M27.7 20.1c-.4-.2-.9-.3-1.4-.3-.5 0-1 .1-1.4.3-1.2.6-2 1.8-2 3.2 0 1.9 1.6 3.5 3.5 3.5s3.5-1.6 3.5-3.5c-.1-1.4-.9-2.6-2.2-3.2zM18 18h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V8h2v2zm-4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V8h2v2zm-4 8H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V8h2v2zm-4 8H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V8h2v2z"/></svg>;
    if (name.startsWith('.env')) return <svg width="16" height="16" viewBox="0 0 32 32"><rect fill="#ecd53f" width="32" height="32" rx="3"/><text x="50%" y="50%" fill="#000" fontSize="18" fontWeight="bold" textAnchor="middle" dy=".35em">E</text></svg>;
    if (name === 'readme.md') return <svg width="16" height="16" viewBox="0 0 32 32"><path fill="#519aba" d="M2 4v24h28V4H2zm24 20H6V8h20v16z"/><path fill="#519aba" d="M8 10h16v2H8zm0 4h16v2H8zm0 4h10v2H8z"/></svg>;
    
    const iconMap = {
      'js': <svg width="16" height="16" viewBox="0 0 32 32"><rect fill="#f7df1e" width="32" height="32" rx="3"/><path d="M18.77 19.52c.4.65 1.03 1.13 2.07 1.13 1.03 0 1.67-.52 1.67-1.23 0-.86-.67-1.16-1.79-1.66l-.62-.26c-1.77-.76-2.95-1.7-2.95-3.7 0-1.84 1.4-3.24 3.6-3.24 1.56 0 2.68.54 3.49 1.96l-1.91 1.23c-.42-.75-.87-1.05-1.58-1.05-.72 0-1.17.45-1.17 1.05 0 .73.45 1.03 1.5 1.48l.61.26c2.09.9 3.27 1.81 3.27 3.87 0 2.22-1.74 3.42-4.08 3.42-2.29 0-3.76-1.09-4.49-2.52l2.03-1.17zm-8.96.19c.36.64.69 1.18 1.48 1.18.76 0 1.23-.3 1.23-1.45V11h2.5v8.5c0 2.39-1.4 3.48-3.45 3.48-1.85 0-2.91-.96-3.46-2.11l1.96-1.13z" fill="#000"/></svg>,
      'jsx': <svg width="16" height="16" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#61dafb"/><ellipse cx="16" cy="16" rx="6" ry="11" fill="none" stroke="#000" strokeWidth="1"/><ellipse cx="16" cy="16" rx="11" ry="6" fill="none" stroke="#000" strokeWidth="1"/><circle cx="16" cy="16" r="2" fill="#000"/></svg>,
      'ts': <svg width="16" height="16" viewBox="0 0 32 32"><rect fill="#3178c6" width="32" height="32" rx="3"/><path d="M18.5 18.5v4.2c.4.2.9.4 1.4.5.5.1 1.1.2 1.6.2.6 0 1.1-.1 1.6-.2.5-.1.9-.3 1.3-.6.4-.3.7-.6.9-1.1.2-.4.3-1 .3-1.6 0-.5-.1-.9-.3-1.3-.2-.4-.5-.7-.8-1-.3-.3-.7-.5-1.2-.7-.4-.2-.9-.4-1.4-.6-.4-.1-.7-.3-1-.4-.3-.1-.5-.3-.7-.5-.2-.2-.3-.4-.4-.6-.1-.2-.1-.5-.1-.7 0-.3.1-.5.2-.7.1-.2.3-.4.5-.5.2-.1.5-.2.8-.3.3-.1.6-.1.9-.1.3 0 .6 0 .9.1.3 0 .6.1.9.2v-3.9c-.4-.1-.8-.2-1.2-.3-.4-.1-.9-.1-1.4-.1-.6 0-1.2.1-1.7.2-.5.2-1 .4-1.4.7-.4.3-.7.7-.9 1.2-.2.5-.3 1-.3 1.6 0 .9.2 1.6.7 2.2.5.6 1.2 1.1 2.2 1.5.4.2.8.3 1.2.5.4.1.7.3 1 .5.3.2.5.4.7.6.2.2.2.5.2.8 0 .3-.1.6-.2.8-.1.2-.3.4-.5.6-.2.2-.5.3-.9.4-.3.1-.7.1-1.1.1-.4 0-.8 0-1.2-.1-.4-.1-.8-.2-1.2-.4zM9 11.5h4.8v12.2h4.1V11.5h4.8V8H9v3.5z" fill="#fff"/></svg>,
      'tsx': <svg width="16" height="16" viewBox="0 0 32 32"><rect fill="#3178c6" width="32" height="32" rx="3"/><circle cx="22" cy="22" r="6" fill="#61dafb"/><path d="M9 11.5h3.5v9h3V11.5h3.5V9H9v2.5z" fill="#fff"/></svg>,
      'json': <svg width="16" height="16" viewBox="0 0 32 32"><rect fill="#5a5a5a" width="32" height="32" rx="3"/><path d="M8 8h2v2h2v2h-2v2H8v-2H6v-2h2V8zm8 0h2v2h2v2h-2v2h-2v-2h-2v-2h2V8zm-8 8h2v2h2v2h-2v2H8v-2H6v-2h2v-2zm8 0h2v2h2v2h-2v2h-2v-2h-2v-2h2v-2z" fill="#f7df1e"/></svg>,
      'html': <svg width="16" height="16" viewBox="0 0 32 32"><path fill="#e34c26" d="M5.9 28.3l-2.4-27h25l-2.4 27L16 31z"/><path fill="#ef652a" d="M16 29.5l8.2-2.3 1.9-21.7H16z"/><path fill="#fff" d="M16 13.3h4.5l.3-3.5H16V6.5h8.1l-.1.8-.8 9.4H16z"/><path fill="#ebebeb" d="M16 21.7l-.1 0-3.2-.9-.2-2.3h-2.9l.4 4.3 5.9 1.6.1 0z"/><path fill="#fff" d="M19.8 16.5l-.4 4.1-3.3.9v3l6-1.7.1-.5.7-7.8.1-.8H16v3.3z"/><path fill="#ebebeb" d="M16 6.5v3.3H8.1l-.1-.8-.2-2.5-.1-.8H16zm0 6.8v3.3h-3.8l-.1-.8-.2-2.5-.1-.8H16z"/></svg>,
      'css': <svg width="16" height="16" viewBox="0 0 32 32"><path fill="#1572b6" d="M5.9 28.3l-2.4-27h25l-2.4 27L16 31z"/><path fill="#33a9dc" d="M16 29.5l8.2-2.3 1.9-21.7H16z"/><path fill="#fff" d="M16 13.3h4.5l.3-3.5H16V6.5h8.1l-.1.8-.8 9.4H16z"/><path fill="#ebebeb" d="M16 21.7l-.1 0-3.2-.9-.2-2.3h-2.9l.4 4.3 5.9 1.6.1 0z"/><path fill="#fff" d="M19.8 16.5l-.4 4.1-3.3.9v3l6-1.7.1-.5.7-7.8.1-.8H16v3.3z"/></svg>,
      'md': <svg width="16" height="16" viewBox="0 0 32 32"><rect fill="#519aba" width="32" height="32" rx="3"/><path fill="#fff" d="M6 10v12h4v-8l3 4 3-4v8h4V10h-4l-3 4-3-4H6z"/></svg>,
      'py': <svg width="16" height="16" viewBox="0 0 32 32"><path fill="#3776ab" d="M15.9 2c-4.4 0-4.1 1.9-4.1 1.9l0 2h4.2v.6H9.7s-2.8-.3-2.8 4.1c0 4.4 2.4 4.2 2.4 4.2h1.5v-2s-.1-2.4 2.4-2.4h4.1s2.3 0 2.3-2.2V4.2S20 2 15.9 2zm-2.3 1.3c.4 0 .8.3.8.8s-.3.8-.8.8-.8-.3-.8-.8.4-.8.8-.8z"/><path fill="#ffd43b" d="M16.1 30c4.4 0 4.1-1.9 4.1-1.9l0-2h-4.2v-.6h6.3s2.8.3 2.8-4.1c0-4.4-2.4-4.2-2.4-4.2h-1.5v2s.1 2.4-2.4 2.4h-4.1s-2.3 0-2.3 2.2v3.9s-.4 2.3 3.7 2.3zm2.3-1.3c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8z"/></svg>,
      'vue': <svg width="16" height="16" viewBox="0 0 32 32"><path fill="#42b883" d="M2 4l14 24L30 4h-5.5L16 18 7.5 4z"/><path fill="#35495e" d="M7.5 4L16 18 24.5 4H20l-4 7-4-7z"/></svg>,
      'yml': <svg width="16" height="16" viewBox="0 0 32 32"><rect fill="#cb171e" width="32" height="32" rx="3"/><text x="50%" y="50%" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle" dy=".35em">YML</text></svg>,
      'yaml': <svg width="16" height="16" viewBox="0 0 32 32"><rect fill="#cb171e" width="32" height="32" rx="3"/><text x="50%" y="50%" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle" dy=".35em">YML</text></svg>
    };
    return iconMap[ext] || <svg width="16" height="16" viewBox="0 0 32 32"><rect fill="#858585" width="32" height="32" rx="3"/><path fill="#fff" d="M8 8h16v2H8zm0 4h16v2H8zm0 4h12v2H8zm0 4h10v2H8z"/></svg>;
  };

  const [folderContents, setFolderContents] = useState({});

  const loadFolderContents = async (folderPath) => {
    if (!window.electronAPI) return [];
    const result = await window.electronAPI.readDirectory(folderPath);
    if (result.success) {
      // Convert to relative paths
      return result.entries.map(entry => ({
        ...entry,
        path: entry.name,
        fullPath: entry.path
      }));
    }
    return [];
  };

  const handleFolderClick = async (dir) => {
    const dirKey = dir.path;
    toggleFolder(dirKey);
    
    if (!folderContents[dirKey]) {
      const fullPath = dir.fullPath || `${projectPath}/${dir.path}`;
      const contents = await loadFolderContents(fullPath);
      setFolderContents(prev => ({ ...prev, [dirKey]: contents }));
    }
  };

  const renderFileTree = (items = files, level = 0) => {
    const directories = items.filter(f => f.type === 'directory');
    const regularFiles = items.filter(f => f.type === 'file');

    return (
      <div className="file-tree">
        {directories.map((dir) => (
          <div key={dir.path} className="file-tree-item">
            <div
              className="file-tree-row directory"
              onClick={() => handleFolderClick(dir)}
              style={{ paddingLeft: `${level * 12}px` }}
            >
              <span className="expand-icon">
                {expandedFolders.has(dir.path) ? '▼' : '▶'}
              </span>
              <span className="folder-icon">📁</span>
              <span className="file-name">{dir.name}</span>
            </div>
            {expandedFolders.has(dir.path) && folderContents[dir.path] && (
              <div className="folder-contents">
                {renderFileTree(folderContents[dir.path], level + 1)}
              </div>
            )}
          </div>
        ))}
        {regularFiles.map((file) => (
          <div key={file.path} className="file-tree-item">
            <div className="file-tree-row file" style={{ paddingLeft: `${level * 12}px` }}>
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
          className={`activity-item ${activeSection === 'editors' ? 'active' : ''}`}
          onClick={() => setActiveSection('editors')}
          title="Open in Editor"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.5 1h-11l-.5.5v13l.5.5h11l.5-.5v-13l-.5-.5zM13 14H3V2h10v12zM5 5h6v1H5V5zm0 2h6v1H5V7zm0 2h4v1H5V9z"/>
          </svg>
        </div>
        <div className="activity-spacer"></div>
        <div 
          className={`activity-item ${activeSection === 'backend' ? 'active' : ''}`}
          onClick={() => setActiveSection('backend')}
          title="Backend"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/>
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

        {activeSection === 'editors' && (
          <>
            <div className="section-header">
              <span className="section-title">OPEN IN EDITOR</span>
            </div>
            
            <div className="editors-content">
              {project ? (
                <div className="editor-list">
                  {availableEditors.length > 0 ? (
                    availableEditors.map(editor => (
                      <div
                        key={editor.id}
                        className="editor-item"
                        onClick={() => handleOpenInEditor(editor)}
                      >
                        <div className="editor-logo">
                          {editor.id === 'vscode' && (
                            <svg width="32" height="32" viewBox="0 0 32 32">
                              <path fill="#0065A9" d="M29.01 5.03L24.3 2.2a1.61 1.61 0 0 0-1.4-.2L9.1 9.5 3.87 5.19c-.43-.32-1.03-.3-1.44.04L1.2 6.33c-.25.2-.4.5-.4.83v17.68c0 .33.15.63.4.83l1.23 1.1c.41.34 1.01.36 1.44.04L9.1 22.5l13.8 7.5c.45.24.98.26 1.4-.2l4.71-2.84c.6-.35.99-.99.99-1.68V6.71c0-.69-.39-1.33-.99-1.68zM23.5 22.5l-8.5-6.5 8.5-6.5v13z"/>
                            </svg>
                          )}
                          {editor.id === 'cursor' && (
                            <svg width="32" height="32" viewBox="0 0 32 32">
                              <rect width="32" height="32" rx="6" fill="#000"/>
                              <path d="M8 8l16 6-6 2-2 6z" fill="#fff"/>
                            </svg>
                          )}
                          {!['vscode', 'cursor'].includes(editor.id) && (
                            <svg width="32" height="32" viewBox="0 0 32 32">
                              <rect width="32" height="32" rx="6" fill="#666"/>
                              <text x="16" y="20" fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">{editor.name[0]}</text>
                            </svg>
                          )}
                        </div>
                        <span className="editor-name">{editor.name}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div
                        className="editor-item"
                        onClick={() => handleOpenInEditor({ cmd: 'code', name: 'VS Code' })}
                      >
                        <div className="editor-logo">
                          <svg width="32" height="32" viewBox="0 0 32 32">
                            <path fill="#0065A9" d="M29.01 5.03L24.3 2.2a1.61 1.61 0 0 0-1.4-.2L9.1 9.5 3.87 5.19c-.43-.32-1.03-.3-1.44.04L1.2 6.33c-.25.2-.4.5-.4.83v17.68c0 .33.15.63.4.83l1.23 1.1c.41.34 1.01.36 1.44.04L9.1 22.5l13.8 7.5c.45.24.98.26 1.4-.2l4.71-2.84c.6-.35.99-.99.99-1.68V6.71c0-.69-.39-1.33-.99-1.68zM23.5 22.5l-8.5-6.5 8.5-6.5v13z"/>
                          </svg>
                        </div>
                        <span className="editor-name">VS Code</span>
                      </div>
                      <div
                        className="editor-item"
                        onClick={() => handleOpenInEditor({ cmd: 'cursor', name: 'Cursor' })}
                      >
                        <div className="editor-logo">
                          <svg width="32" height="32" viewBox="0 0 32 32">
                            <rect width="32" height="32" rx="6" fill="#000"/>
                            <path d="M8 8l16 6-6 2-2 6z" fill="#fff"/>
                          </svg>
                        </div>
                        <span className="editor-name">Cursor</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="no-project">
                  <p>No project loaded</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === 'backend' && (
          <>
            <div className="section-header">
              <span className="section-title">BACKEND</span>
            </div>
            
            <BackendSection />
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
              
              <button onClick={checkSystemDependencies} disabled={checkingDeps} className="check-deps-btn">
                {checkingDeps ? 'Checking...' : '🔍 Check System Dependencies'}
              </button>
              
              {systemDeps && (
                <div className="system-deps">
                  {systemDeps.missing.length === 0 ? (
                    <div className="deps-ok">✅ All dependencies installed</div>
                  ) : (
                    <div className="deps-missing">
                      <div className="deps-title">⚠️ Missing Dependencies:</div>
                      {systemDeps.missing.map(dep => (
                        <div key={dep.name} className="dep-item">
                          <span className="dep-name">{dep.name}</span>
                          {dep.canAutoInstall ? (
                            <button 
                              onClick={() => handleInstallDependency(dep.name)}
                              disabled={installingDep === dep.name}
                              className="install-btn"
                            >
                              {installingDep === dep.name ? 'Installing...' : 'Install'}
                            </button>
                          ) : (
                            <button 
                              onClick={() => window.electronAPI.openExternal(dep.installUrl)}
                              className="manual-btn"
                            >
                              Download
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {analysis && (
                <div className="project-info">
                  <h4>Project Info</h4>
                  {analysis.language && (
                    <>
                      <div className="info-item">
                        <span className="info-label">Language:</span>
                        <span className="info-value">{analysis.language}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Manager:</span>
                        <span className="info-value">{analysis.manager}</span>
                      </div>
                    </>
                  )}
                  <div className="info-item">
                    <span className="info-label">Type:</span>
                    <span className="info-value">{analysis.type}</span>
                  </div>
                  {analysis.type === 'fullstack' && (
                    <>
                      <div className="info-item">
                        <span className="info-label">Backend:</span>
                        <span className="info-value">{analysis.hasBackend ? '✅' : '❌'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Frontend:</span>
                        <span className="info-value">{analysis.hasFrontend ? '✅' : '❌'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Database:</span>
                        <span className="info-value">{analysis.hasDatabase ? '✅' : '❌'}</span>
                      </div>
                      {analysis.isMonorepo && (
                        <div className="info-item">
                          <span className="info-label">Structure:</span>
                          <span className="info-value">Monorepo</span>
                        </div>
                      )}
                    </>
                  )}
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
