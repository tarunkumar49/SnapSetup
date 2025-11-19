import React, { useEffect, useRef, useState } from 'react';
import './ProjectGraph.css';

function ProjectGraph({ project, analysis }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const animationRef = useRef(null);

  useEffect(() => {
    if (!project || !analysis) return;

    // Create nodes based on project structure
    const projectNodes = createProjectNodes(project, analysis);
    setNodes(projectNodes);

    // Create edges based on dependencies
    const projectEdges = createProjectEdges(projectNodes, analysis);
    setEdges(projectEdges);
  }, [project, analysis]);

  useEffect(() => {
    if (nodes.length === 0 || edges.length === 0) return;

    // Start animation
    const startAnimation = () => {
      animationRef.current = requestAnimationFrame(animate);
    };
    startAnimation();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, edges]);

  const createProjectNodes = (project, analysis) => {
    const nodes = [];
    const centerX = 400;
    const centerY = 300;

    if (analysis.type === 'fullstack') {
      // Client/Browser
      nodes.push({
        id: 'client',
        label: 'Client\n(Browser)',
        x: centerX,
        y: 80,
        type: 'client',
        size: 55,
        color: '#60a5fa'
      });

      // Frontend
      nodes.push({
        id: 'frontend',
        label: `Frontend\n${analysis.stack.find(s => s.includes('React') || s.includes('Next') || s.includes('Vue')) || 'UI'}`,
        x: centerX,
        y: 200,
        type: 'frontend',
        size: 60,
        color: '#4ade80'
      });

      // API/Backend
      nodes.push({
        id: 'backend',
        label: `Backend\n${analysis.stack.find(s => s.includes('Express') || s.includes('Node')) || 'API'}`,
        x: centerX,
        y: 350,
        type: 'backend',
        size: 60,
        color: '#fbbf24'
      });

      // Database
      const dbTech = analysis.stack.find(s => s.includes('MongoDB') || s.includes('PostgreSQL') || s.includes('MySQL'));
      if (dbTech) {
        nodes.push({
          id: 'database',
          label: `Database\n${dbTech}`,
          x: centerX,
          y: 500,
          type: 'database',
          size: 55,
          color: '#f87171'
        });
      }

      // Environment Config
      nodes.push({
        id: 'env',
        label: '.env\nConfig',
        x: centerX + 180,
        y: 350,
        type: 'config',
        size: 40,
        color: '#a78bfa'
      });

      // External APIs
      nodes.push({
        id: 'external',
        label: 'External\nAPIs',
        x: centerX - 180,
        y: 350,
        type: 'external',
        size: 40,
        color: '#fb923c'
      });

    } else if (analysis.type === 'frontend') {
      // Client
      nodes.push({
        id: 'client',
        label: 'Client\n(Browser)',
        x: centerX,
        y: 150,
        type: 'client',
        size: 55,
        color: '#60a5fa'
      });

      // Frontend App
      nodes.push({
        id: 'frontend',
        label: `${analysis.stack[0] || 'Frontend'}\nApp`,
        x: centerX,
        y: 300,
        type: 'frontend',
        size: 65,
        color: '#4ade80'
      });

      // API Services
      nodes.push({
        id: 'api',
        label: 'API\nServices',
        x: centerX,
        y: 450,
        type: 'api',
        size: 50,
        color: '#fbbf24'
      });

    } else if (analysis.type === 'backend') {
      // Client Requests
      nodes.push({
        id: 'client',
        label: 'Client\nRequests',
        x: centerX,
        y: 150,
        type: 'client',
        size: 50,
        color: '#60a5fa'
      });

      // API Server
      nodes.push({
        id: 'server',
        label: `${analysis.stack[0] || 'API'}\nServer`,
        x: centerX,
        y: 300,
        type: 'backend',
        size: 65,
        color: '#fbbf24'
      });

      // Database
      const dbTech = analysis.stack.find(s => s.includes('MongoDB') || s.includes('PostgreSQL') || s.includes('MySQL'));
      if (dbTech) {
        nodes.push({
          id: 'database',
          label: `${dbTech}\nDatabase`,
          x: centerX,
          y: 450,
          type: 'database',
          size: 55,
          color: '#f87171'
        });
      }
    }

    return nodes;
  };

  const createProjectEdges = (nodes, analysis) => {
    const edges = [];

    if (analysis.type === 'fullstack') {
      // Client <-> Frontend (bidirectional)
      edges.push({ from: 'client', to: 'frontend', particles: [], label: 'HTTP Request' });
      edges.push({ from: 'frontend', to: 'client', particles: [], label: 'HTML/CSS/JS' });

      // Frontend <-> Backend (bidirectional)
      edges.push({ from: 'frontend', to: 'backend', particles: [], label: 'API Calls' });
      edges.push({ from: 'backend', to: 'frontend', particles: [], label: 'JSON Data' });

      // Backend <-> Database
      if (nodes.find(n => n.id === 'database')) {
        edges.push({ from: 'backend', to: 'database', particles: [], label: 'Queries' });
        edges.push({ from: 'database', to: 'backend', particles: [], label: 'Results' });
      }

      // Backend <-> External APIs
      edges.push({ from: 'backend', to: 'external', particles: [], label: 'API Requests' });
      edges.push({ from: 'external', to: 'backend', particles: [], label: 'Responses' });

      // Backend -> Env
      edges.push({ from: 'backend', to: 'env', particles: [], label: 'Read Config' });

    } else if (analysis.type === 'frontend') {
      edges.push({ from: 'client', to: 'frontend', particles: [], label: 'User Actions' });
      edges.push({ from: 'frontend', to: 'client', particles: [], label: 'UI Updates' });
      edges.push({ from: 'frontend', to: 'api', particles: [], label: 'API Calls' });
      edges.push({ from: 'api', to: 'frontend', particles: [], label: 'Data' });

    } else if (analysis.type === 'backend') {
      edges.push({ from: 'client', to: 'server', particles: [], label: 'HTTP Requests' });
      edges.push({ from: 'server', to: 'client', particles: [], label: 'Responses' });
      if (nodes.find(n => n.id === 'database')) {
        edges.push({ from: 'server', to: 'database', particles: [], label: 'Queries' });
        edges.push({ from: 'database', to: 'server', particles: [], label: 'Data' });
      }
    }

    // Initialize particles
    edges.forEach((edge, i) => {
      edge.particles = [{ progress: (i * 0.15) % 1 }];
    });

    return edges;
  };



  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setTransform(prev => ({
          ...prev,
          scale: Math.max(0.5, Math.min(3, prev.scale * delta))
        }));
      }
    };

    const mouseDownHandler = (e) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const mouseMoveHandler = (e) => {
      if (!isDragging) return;
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    };

    const mouseUpHandler = () => {
      setIsDragging(false);
    };

    canvas.addEventListener('wheel', wheelHandler, { passive: false });
    canvas.addEventListener('mousedown', mouseDownHandler);
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);

    return () => {
      canvas.removeEventListener('wheel', wheelHandler);
      canvas.removeEventListener('mousedown', mouseDownHandler);
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
  }, [isDragging, dragStart, transform]);

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Draw edges with arrows and particles
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode) {
        // Draw edge line with gradient
        const gradient = ctx.createLinearGradient(fromNode.x, fromNode.y, toNode.x, toNode.y);
        gradient.addColorStop(0, 'rgba(0, 122, 204, 0.6)');
        gradient.addColorStop(1, 'rgba(74, 222, 128, 0.6)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();

        // Draw arrow head
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const arrowSize = 12;
        const arrowX = toNode.x - Math.cos(angle) * (toNode.size / 2 + 10);
        const arrowY = toNode.y - Math.sin(angle) * (toNode.size / 2 + 10);
        
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Draw edge label
        if (edge.label) {
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(midX - 40, midY - 10, 80, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(edge.label, midX, midY);
        }

        // Update and draw animated particles
        edge.particles.forEach(particle => {
          particle.progress += 0.008;
          if (particle.progress > 1) particle.progress = 0;

          const x = fromNode.x + (toNode.x - fromNode.x) * particle.progress;
          const y = fromNode.y + (toNode.y - fromNode.y) * particle.progress;

          // Glowing particle effect
          const particleGradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
          particleGradient.addColorStop(0, 'rgba(74, 222, 128, 1)');
          particleGradient.addColorStop(1, 'rgba(74, 222, 128, 0)');
          ctx.fillStyle = particleGradient;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });

    // Draw nodes with different shapes
    nodes.forEach(node => {
      const halfSize = node.size / 2;
      
      // Draw shape based on node type
      if (node.type === 'database') {
        // Cylinder for database
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.ellipse(node.x, node.y - halfSize / 2, halfSize, halfSize / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(node.x - halfSize, node.y - halfSize / 2, node.size, node.size);
        ctx.beginPath();
        ctx.ellipse(node.x, node.y + halfSize / 2, halfSize, halfSize / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (node.type === 'client' || node.type === 'external') {
        // Hexagon for client/external
        ctx.fillStyle = node.color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = node.x + halfSize * Math.cos(angle);
          const y = node.y + halfSize * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (node.type === 'config') {
        // Diamond for config
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y - halfSize);
        ctx.lineTo(node.x + halfSize, node.y);
        ctx.lineTo(node.x, node.y + halfSize);
        ctx.lineTo(node.x - halfSize, node.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Rounded rectangle for others
        const radius = 8;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.roundRect(node.x - halfSize, node.y - halfSize, node.size, node.size, radius);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Node label inside shape
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const lines = node.label.split('\n');
      lines.forEach((line, i) => {
        const text = line.length > 12 ? line.substring(0, 10) + '..' : line;
        ctx.fillText(text, node.x, node.y + (i - lines.length / 2 + 0.5) * 14);
      });
    });

    ctx.restore();
    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="project-graph" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="graph-canvas"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />
    </div>
  );
}

export default ProjectGraph;
