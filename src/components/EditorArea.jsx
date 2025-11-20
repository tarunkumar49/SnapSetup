import React, { useEffect, useRef, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import ProjectGraph from './ProjectGraph';
import './EditorArea.css';

function EditorArea() {
  const { project, analysis, loadProject, showToast } = useProject();

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

  const handleViewDocs = () => {
    const url = 'https://snapsetuplandingpage.vercel.app';
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };
  const [diagramSvg, setDiagramSvg] = useState('');

  useEffect(() => {
    if (analysis) {
      generateD2Diagram();
    }
  }, [analysis]);

  const generateD2Diagram = async () => {
    const d2Code = createD2Workflow();
    
    // For now, render as simple SVG until D2 CLI is available
    const svg = createSimpleSvgDiagram();
    setDiagramSvg(svg);
  };

  const createD2Workflow = () => {
    if (!analysis) return '';

    const type = analysis.type || 'Project';
    const stack = (analysis.stack || []).join(', ');
    const hasDocker = analysis.hasDockerCompose;
    const hasDB = (analysis.stack || []).some(tech => 
      ['MongoDB', 'PostgreSQL', 'MySQL', 'SQLite'].includes(tech)
    );
    const dbName = (analysis.stack || []).find(tech => 
      ['MongoDB', 'PostgreSQL', 'MySQL', 'SQLite'].includes(tech)
    ) || 'Database';

    let d2 = project.name + ': {\n  shape: rectangle\n  style: {\n    fill: "#007ACC"\n    stroke: "#007ACC"\n    font-color: "#ffffff"\n  }\n}\n\n' + type + ': {\n  shape: rectangle\n  style: {\n    fill: "#000000"\n    stroke: "#007ACC"\n    font-color: "#ffffff"\n  }\n}\n\n' + project.name + ' -> ' + type + '\n' + type + ' -> "' + stack + '"\n"' + stack + '" -> "Install Packages"\n"Install Packages" -> "Setup .env"';

    if (hasDB) {
      d2 += '\n"Setup .env" -> "' + dbName + '"';
      if (hasDocker) {
        d2 += '\n"' + dbName + '" -> "Docker Compose"\n"Docker Compose" -> "Start Dev Server"';
      } else {
        d2 += '\n"' + dbName + '" -> "Start Dev Server"';
      }
    } else {
      if (hasDocker) {
        d2 += '\n"Setup .env" -> "Docker Compose"\n"Docker Compose" -> "Start Dev Server"';
      } else {
        d2 += '\n"Setup .env" -> "Start Dev Server"';
      }
    }

    d2 += '\n"Start Dev Server" -> Ready: {\n  style: {\n    fill: "#4ade80"\n    stroke: "#4ade80"\n    font-color: "#000000"\n  }\n}';

    return d2;
  };

  const createSimpleSvgDiagram = () => {
    if (!analysis) return '';

    const steps = [];
    steps.push(project.name || 'Project');
    steps.push(analysis.type || 'Unknown');
    steps.push((analysis.stack || []).join(', '));
    steps.push('Install Packages');
    steps.push('Setup .env');
    
    const hasDB = (analysis.stack || []).some(tech => 
      ['MongoDB', 'PostgreSQL', 'MySQL', 'SQLite'].includes(tech)
    );
    if (hasDB) {
      const dbName = (analysis.stack || []).find(tech => 
        ['MongoDB', 'PostgreSQL', 'MySQL', 'SQLite'].includes(tech)
      );
      steps.push(dbName);
    }
    if (analysis.hasDockerCompose) steps.push('Docker Compose');
    steps.push('Start Dev Server');
    steps.push('Ready');

    const width = 800;
    const height = 100 + steps.length * 80;
    const boxWidth = 200;
    const boxHeight = 60;
    const startX = (width - boxWidth) / 2;
    const startY = 50;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    steps.forEach((step, i) => {
      const y = startY + i * 80;
      const isFirst = i === 0;
      const isLast = i === steps.length - 1;
      const fill = isFirst ? '#007ACC' : isLast ? '#4ade80' : '#000000';
      const textColor = isLast ? '#000000' : '#ffffff';
      
      svg += `<rect x="${startX}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="${fill}" stroke="#007ACC" stroke-width="2" rx="4"/>`;
      svg += `<text x="${startX + boxWidth/2}" y="${y + boxHeight/2 + 5}" text-anchor="middle" fill="${textColor}" font-size="14" font-family="Comfortaa">${step}</text>`;
      
      if (i < steps.length - 1) {
        svg += `<line x1="${startX + boxWidth/2}" y1="${y + boxHeight}" x2="${startX + boxWidth/2}" y2="${y + boxHeight + 20}" stroke="#007ACC" stroke-width="2" marker-end="url(#arrowhead)"/>`;
      }
    });
    
    svg += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><polygon points="0 0, 10 5, 0 10" fill="#007ACC"/></marker></defs></svg>`;
    
    return svg;
  };

  if (!project) {
    return (
      <div className="editor-area">
        <div className="welcome-screen">
          <div className="welcome-content">
            <div className="vscode-logo">
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                <path d="M50 20L10 35L50 50L90 35L50 20Z" stroke="#007ACC" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 65L50 80L90 65" stroke="#007ACC" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 50L50 65L90 50" stroke="#ff8c00" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1>SnapSetup</h1>
            <p>AI-powered project setup automation</p>
            <div className="welcome-actions">
              <button className="welcome-btn primary" onClick={handleUploadProject}>
                Upload Project
              </button>
              <button className="welcome-btn" onClick={handleViewDocs}>
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-area">
      <div className="editor-tabs">
        <div className="tab active">
          <span className="tab-icon">📊</span>
          <span className="tab-name">Project Workflow</span>
        </div>
      </div>
      
      <div className="editor-content">
        <div className="workflow-header">
          <h2>Project Setup Workflow</h2>
          <p>Visual representation of your project's setup process</p>
        </div>
        
        <div className="mermaid-container">
          <ProjectGraph project={project} analysis={analysis} />
        </div>
        
        {analysis && (
          <div className="workflow-details">
            <div className="detail-section">
              <h3>Detected Configuration</h3>
              <ul>
                <li><strong>Type:</strong> {analysis.type || 'Unknown'}</li>
                <li><strong>Stack:</strong> {(analysis.stack || []).join(', ') || 'None'}</li>
                <li><strong>Package Manager:</strong> {analysis.packageManager || analysis.manager || 'npm'}</li>
                {(analysis.ports || []).length > 0 && (
                  <li><strong>Ports:</strong> {(analysis.ports || []).join(', ')}</li>
                )}
              </ul>
            </div>
            
            <div className="detail-section">
              <h3>Setup Steps</h3>
              <ol>
                <li>Install dependencies</li>
                <li>Configure environment variables</li>
                {analysis.hasDockerCompose && <li>Setup Docker containers</li>}
                <li>Start development servers</li>
                <li>Verify setup completion</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditorArea;