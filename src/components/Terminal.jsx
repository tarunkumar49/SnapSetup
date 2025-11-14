import React, { useEffect, useRef, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import './Terminal.css';

function Terminal() {
  const { projectPath, loadProject } = useProject();
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeTerminal, setActiveTerminal] = useState('main');
  const [terminals, setTerminals] = useState([
    { id: 'main', name: 'PowerShell', type: 'powershell', output: [], history: [], currentDir: '', inputValue: '', historyIndex: -1 },
    { id: 'node', name: 'Node.js', type: 'node', output: [], history: [], currentDir: '', inputValue: '', historyIndex: -1 },
    { id: 'git', name: 'Git', type: 'git', output: [], history: [], currentDir: '', inputValue: '', historyIndex: -1 }
  ]);
  
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getHomeDir().then(homeDir => {
        if (homeDir) {
          setTerminals(prev => prev.map(t => ({ ...t, currentDir: t.currentDir || homeDir })));
        }
      });
    }
  }, []);
  
  useEffect(() => {
    if (projectPath) {
      setTerminals(prev => prev.map(t => t.id === activeTerminal ? { ...t, currentDir: projectPath } : t));
    }
  }, [projectPath, activeTerminal]);
  
  const activeTerminalData = terminals.find(t => t.id === activeTerminal) || terminals[0];

  const addOutput = (terminalId, output) => {
    setTerminals(prev => prev.map(t => 
      t.id === terminalId ? { ...t, output: [...t.output, { id: `${Date.now()}-${Math.random()}`, ...output }] } : t
    ));
  };
  
  const clearOutput = (terminalId) => {
    setTerminals(prev => prev.map(t => t.id === terminalId ? { ...t, output: [] } : t));
  };

  useEffect(() => {
    if (!window.electronAPI) return;

    const handleOutput = (data) => {
      addOutput(activeTerminal, { type: data.type, text: data.data });
    };

    const handleComplete = (data) => {
      addOutput(activeTerminal, { type: 'info', text: `\n` });
    };

    const handleError = (data) => {
      addOutput(activeTerminal, { type: 'error', text: `Error: ${data.error}\n` });
    };

    window.electronAPI.onCommandOutput(handleOutput);
    window.electronAPI.onCommandComplete(handleComplete);
    window.electronAPI.onCommandError(handleError);

    return () => {
      window.electronAPI.removeListener('command-output');
      window.electronAPI.removeListener('command-complete');
      window.electronAPI.removeListener('command-error');
    };
  }, [activeTerminal]);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activeTerminalData.output, autoScroll]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const handleClear = () => {
    clearOutput(activeTerminal);
  };

  const handleCopy = () => {
    const text = activeTerminalData.output.map((o) => o.text).join('');
    navigator.clipboard.writeText(text);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const getLineClass = (type) => {
    if (type === 'stderr' || type === 'error') return 'error';
    if (type === 'info') return 'info';
    return 'stdout';
  };

  const createNewTerminal = async () => {
    const newId = `terminal-${Date.now()}`;
    const homeDir = window.electronAPI ? await window.electronAPI.getHomeDir() : '';
    setTerminals([...terminals, { 
      id: newId, 
      name: `Terminal ${terminals.length + 1}`, 
      type: 'powershell',
      output: [],
      history: [],
      currentDir: homeDir,
      inputValue: '',
      historyIndex: -1
    }]);
    setActiveTerminal(newId);
  };

  const closeTerminal = (terminalId, e) => {
    e.stopPropagation();
    if (terminals.length === 1) return;
    const filtered = terminals.filter(t => t.id !== terminalId);
    setTerminals(filtered);
    if (activeTerminal === terminalId) {
      setActiveTerminal(filtered[0]?.id || 'main');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(activeTerminalData.inputValue);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const { history, historyIndex } = activeTerminalData;
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setTerminals(prev => prev.map(t => 
          t.id === activeTerminal ? { ...t, historyIndex: newIndex, inputValue: history[history.length - 1 - newIndex] } : t
        ));
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const { historyIndex } = activeTerminalData;
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setTerminals(prev => prev.map(t => 
          t.id === activeTerminal ? { ...t, historyIndex: newIndex, inputValue: activeTerminalData.history[activeTerminalData.history.length - 1 - newIndex] } : t
        ));
      } else if (historyIndex === 0) {
        setTerminals(prev => prev.map(t => t.id === activeTerminal ? { ...t, historyIndex: -1, inputValue: '' } : t));
      }
    }
  };

  const checkAndPromptProjectOpen = async (dirPath) => {
    if (!window.electronAPI) return;
    
    const pkgPath = `${dirPath}\\package.json`;
    const pkgExists = await window.electronAPI.fileExists(pkgPath);
    if (pkgExists && dirPath !== projectPath) {
      addOutput(activeTerminal, {
        type: 'info',
        text: `\n📦 Detected project in ${dirPath}\nType 'open' to load this project in SnapSetup\n`
      });
    }
  };
  
  const executeCommand = async (command) => {
    if (!command.trim()) return;
    
    const currentDir = activeTerminalData.currentDir;
    
    setTerminals(prev => prev.map(t => 
      t.id === activeTerminal ? { ...t, history: [...t.history, command], historyIndex: -1, inputValue: '' } : t
    ));
    
    addOutput(activeTerminal, {
      type: 'stdout',
      text: `PS ${currentDir}> ${command}\n`
    });
    
    // Handle built-in commands and Unix aliases
    let cmd = command.trim();
    const cmdLower = cmd.toLowerCase();
    
    // Unix to Windows command mapping (for Windows users)
    if (cmdLower === 'ls') cmd = 'dir';
    else if (cmdLower.startsWith('ls ')) cmd = 'dir' + cmd.substring(2);
    else if (cmdLower === 'cat') cmd = 'type';
    else if (cmdLower.startsWith('cat ')) cmd = 'type' + cmd.substring(3);
    else if (cmdLower === 'rm') cmd = 'del';
    else if (cmdLower.startsWith('rm ')) cmd = 'del' + cmd.substring(2);
    
    if (cmdLower === 'clear' || cmdLower === 'cls') {
      clearOutput(activeTerminal);
      return;
    }
    
    if (cmdLower === 'pwd') {
      addOutput(activeTerminal, { type: 'stdout', text: `${currentDir}\n` });
      return;
    }
    
    if (cmdLower === 'date') {
      addOutput(activeTerminal, { type: 'stdout', text: `${new Date().toString()}\n` });
      return;
    }
    
    if (cmdLower === 'open') {
      const pkgPath = `${currentDir}\\package.json`;
      const pkgExists = await window.electronAPI.fileExists(pkgPath);
      if (pkgExists) {
        addOutput(activeTerminal, { type: 'info', text: `Loading project from ${currentDir}...\n` });
        await loadProject(currentDir);
      } else {
        addOutput(activeTerminal, { type: 'error', text: `No package.json found in ${currentDir}\n` });
      }
      return;
    }
    
    if (cmdLower.startsWith('cd ')) {
      const newPath = cmd.substring(3).trim();
      let targetPath;
      
      if (newPath === '..') {
        const parts = currentDir.split('\\');
        parts.pop();
        targetPath = parts.join('\\') || 'C:\\';
      } else if (newPath.includes(':')) {
        targetPath = newPath;
      } else {
        targetPath = `${currentDir}\\${newPath}`;
      }
      
      setTerminals(prev => prev.map(t => t.id === activeTerminal ? { ...t, currentDir: targetPath } : t));
      addOutput(activeTerminal, { type: 'stdout', text: `${targetPath}\n` });
      checkAndPromptProjectOpen(targetPath);
      return;
    }
    
    if (window.electronAPI) {
      await window.electronAPI.runCommand(cmd, [], currentDir, Date.now());
    } else {
      addOutput(activeTerminal, { type: 'error', text: 'Terminal requires Electron environment\n' });
    }
  };

  return (
    <div className="vscode-terminal">
      <div className="terminal-tab-bar">
        <div className="terminal-tabs">
          {terminals.map((terminal) => (
            <div
              key={terminal.id}
              className={`terminal-tab ${activeTerminal === terminal.id ? 'active' : ''}`}
              onClick={() => setActiveTerminal(terminal.id)}
            >
              <span className="tab-icon">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.5 1h13l.5.5v10l-.5.5h-13l-.5-.5v-10l.5-.5zM14 11V2H2v9h12zM0 13.5l.5.5h15l.5-.5v-1h-1v1H1v-1H0v1z"/>
                </svg>
              </span>
              <span className="tab-name">{terminal.name}</span>
              <button className="tab-close" onClick={(e) => closeTerminal(terminal.id, e)}>×</button>
            </div>
          ))}
          <button className="new-terminal" onClick={createNewTerminal} title="New Terminal">
            +
          </button>
        </div>
        
        <div className="terminal-controls">
          <button onClick={handleCopy} className="terminal-control-btn" title="Copy">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 4l1-1h5.414L14 6.586V14l-1 1H5l-1-1V4zm9 3l-3-3H5v10h8V7z"/>
              <path d="M3 1L2 2v10l1 1V2h6.414l-1-1H3z"/>
            </svg>
          </button>
          <button onClick={handleClear} className="terminal-control-btn" title="Clear">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 3h3v1h-1v9l-1 1H4l-1-1V4H2V3h3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zM9 2H6v1h3V2zM4 13h7V4H4v9zm2-8H5v7h1V5zm1 0h1v7H7V5zm2 0h1v7H9V5z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="terminal-content" ref={terminalRef} onScroll={handleScroll} onClick={() => inputRef.current?.focus()}>
        <div className="terminal-lines">
          {activeTerminalData.output.map((output, index) => (
            <div key={output.id || index} className={`terminal-line ${getLineClass(output.type)}`}>
              <span className="output-text">{output.text}</span>
            </div>
          ))}
        </div>
        <div className="terminal-input-line">
          <span className="prompt-text">PS {activeTerminalData.currentDir}&gt;</span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={activeTerminalData.inputValue}
            onChange={(e) => setTerminals(prev => prev.map(t => t.id === activeTerminal ? { ...t, inputValue: e.target.value } : t))}
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

export default Terminal;
