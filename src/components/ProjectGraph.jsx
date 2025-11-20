import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import './ProjectGraph.css';

function ProjectGraph({ project, analysis }) {
  const mermaidRef = useRef(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#1e3a8a',
        primaryTextColor: '#fff',
        primaryBorderColor: '#3b82f6',
        lineColor: '#60a5fa',
        secondaryColor: '#065f46',
        tertiaryColor: '#7c2d12',
        background: '#1e1e1e',
        mainBkg: '#2563eb',
        secondBkg: '#10b981',
        tertiaryBkg: '#f59e0b',
        textColor: '#ffffff',
        border1: '#3b82f6',
        border2: '#10b981',
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
    });
  }, []);

  useEffect(() => {
    if (!project || !analysis || !mermaidRef.current) return;

    try {
      const mermaidCode = generateMermaidCode(analysis);
      mermaidRef.current.innerHTML = mermaidCode;
      mermaidRef.current.removeAttribute('data-processed');
      mermaid.contentLoaded();
    } catch (error) {
      console.error('Mermaid render error:', error);
      mermaidRef.current.innerHTML = '<p style="color: #999; text-align: center;">Unable to render diagram</p>';
    }
  }, [project, analysis]);

  const generateMermaidCode = (analysis) => {
    if (!analysis || !analysis.type) {
      return `
graph TB
    App["📦 Project"]:::appStyle
    classDef appStyle fill:#10b981,stroke:#34d399,stroke-width:3px,color:#fff
`;
    }
    if (analysis.type === 'fullstack') {
      const frontend = analysis.stack.find(s => ['React', 'Next.js', 'Vue', 'Vite'].some(f => s.includes(f))) || 'Frontend';
      const backend = analysis.stack.find(s => ['Express', 'Fastify', 'NestJS', 'Koa'].some(b => s.includes(b))) || 'Backend';
      const db = analysis.stack.find(s => ['MongoDB', 'PostgreSQL', 'MySQL'].some(d => s.includes(d)));

      return `
graph TB
    Client["👤 Client<br/>(Browser)"]:::clientStyle
    Frontend["⚛️ ${frontend}<br/>Frontend"]:::frontendStyle
    Backend["🔧 ${backend}<br/>API Server"]:::backendStyle
    ${db ? `DB[("🗄️ ${db}<br/>Database")]:::dbStyle` : ''}
    Env{{".env<br/>Config"}}:::configStyle
    External["🌐 External<br/>APIs"]:::externalStyle

    Client -->|"HTTP Request"| Frontend
    Frontend -->|"HTML/CSS/JS"| Client
    Frontend -->|"API Calls"| Backend
    Backend -->|"JSON Data"| Frontend
    ${db ? 'Backend -->|"Queries"| DB\n    DB -->|"Results"| Backend' : ''}
    Backend -.->|"API Requests"| External
    External -.->|"Responses"| Backend
    Backend -.->|"Read Config"| Env

    classDef clientStyle fill:#3b82f6,stroke:#60a5fa,stroke-width:3px,color:#fff
    classDef frontendStyle fill:#10b981,stroke:#34d399,stroke-width:3px,color:#fff
    classDef backendStyle fill:#f59e0b,stroke:#fbbf24,stroke-width:3px,color:#fff
    classDef dbStyle fill:#ef4444,stroke:#f87171,stroke-width:3px,color:#fff
    classDef configStyle fill:#8b5cf6,stroke:#a78bfa,stroke-width:3px,color:#fff
    classDef externalStyle fill:#f97316,stroke:#fb923c,stroke-width:3px,color:#fff
`;
    } else if (analysis.type === 'frontend') {
      const tech = analysis.stack[0] || 'Frontend';
      return `
graph TB
    Client["👤 Client<br/>(Browser)"]:::clientStyle
    App["⚛️ ${tech}<br/>Application"]:::frontendStyle
    API["🌐 API<br/>Services"]:::apiStyle

    Client -->|"User Actions"| App
    App -->|"UI Updates"| Client
    App -->|"API Calls"| API
    API -->|"Data"| App

    classDef clientStyle fill:#3b82f6,stroke:#60a5fa,stroke-width:3px,color:#fff
    classDef frontendStyle fill:#10b981,stroke:#34d399,stroke-width:3px,color:#fff
    classDef apiStyle fill:#f59e0b,stroke:#fbbf24,stroke-width:3px,color:#fff
`;
    } else if (analysis.type === 'backend') {
      const tech = analysis.stack[0] || 'API';
      const db = analysis.stack.find(s => ['MongoDB', 'PostgreSQL', 'MySQL'].some(d => s.includes(d)));
      return `
graph TB
    Client["👤 Client<br/>Requests"]:::clientStyle
    Server["🔧 ${tech}<br/>Server"]:::backendStyle
    ${db ? `DB[("🗄️ ${db}<br/>Database")]:::dbStyle` : ''}

    Client -->|"HTTP Requests"| Server
    Server -->|"Responses"| Client
    ${db ? 'Server -->|"Queries"| DB\n    DB -->|"Data"| Server' : ''}

    classDef clientStyle fill:#3b82f6,stroke:#60a5fa,stroke-width:3px,color:#fff
    classDef backendStyle fill:#f59e0b,stroke:#fbbf24,stroke-width:3px,color:#fff
    classDef dbStyle fill:#ef4444,stroke:#f87171,stroke-width:3px,color:#fff
`;
    } else if (analysis.isDocker) {
      return `
graph TB
    Docker["🐳 Docker<br/>Container"]:::dockerStyle
    App["📦 Application<br/>${analysis.language}"]:::appStyle
    Ports["🔌 Ports<br/>Exposed"]:::portStyle

    Docker -->|"Runs"| App
    App -->|"Listens on"| Ports

    classDef dockerStyle fill:#2496ed,stroke:#4db8ff,stroke-width:3px,color:#fff
    classDef appStyle fill:#10b981,stroke:#34d399,stroke-width:3px,color:#fff
    classDef portStyle fill:#8b5cf6,stroke:#a78bfa,stroke-width:3px,color:#fff
`;
    }

    return `
graph TB
    App["📦 ${analysis.language || 'Application'}<br/>Project"]:::appStyle
    Deps["📚 Dependencies<br/>${analysis.manager || 'Package Manager'}"]:::depsStyle

    App -->|"Uses"| Deps

    classDef appStyle fill:#10b981,stroke:#34d399,stroke-width:3px,color:#fff
    classDef depsStyle fill:#f59e0b,stroke:#fbbf24,stroke-width:3px,color:#fff
`;
  };

  return (
    <div className="project-graph">
      <div ref={mermaidRef} className="mermaid"></div>
    </div>
  );
}

export default ProjectGraph;
