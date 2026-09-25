import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Layers, Info } from 'lucide-react';

interface ModuleNode {
  id: string;
  name: string;
  role: string;
  status: 'core' | 'clean' | 'warning';
  cx: number;
  cy: number;
  inboundDeps: string[];
  outboundDeps: string[];
  description: string;
}

const MODULES: ModuleNode[] = [
  {
    id: 'main',
    name: 'app/main.py',
    role: 'Central Application Hub',
    status: 'core',
    cx: 250,
    cy: 165,
    inboundDeps: [],
    outboundDeps: ['auth', 'ast', 'user', 'cycle'],
    description: 'FastAPI entry point configuring routing, middleware pipelines, and lifecycle events.',
  },
  {
    id: 'auth',
    name: 'routes/auth.py',
    role: 'Session & Auth Guard',
    status: 'clean',
    cx: 95,
    cy: 75,
    inboundDeps: ['main'],
    outboundDeps: ['user'],
    description: 'Bcrypt password hashing, secure httpOnly session cookies, and route guards.',
  },
  {
    id: 'ast',
    name: 'analysis/ast.py',
    role: 'AST Syntax Tree Parser',
    status: 'clean',
    cx: 405,
    cy: 75,
    inboundDeps: ['main'],
    outboundDeps: ['cycle'],
    description: 'Deterministic Python & JavaScript syntax tree extraction without code execution.',
  },
  {
    id: 'cycle',
    name: 'graph/cycle.py',
    role: 'Coupling & Cycle Detector',
    status: 'warning',
    cx: 405,
    cy: 255,
    inboundDeps: ['main', 'ast'],
    outboundDeps: ['waves'],
    description: "Tarjan's strongly connected components algorithm detecting circular module imports.",
  },
  {
    id: 'user',
    name: 'models/user.py',
    role: 'Database Schema & ORM',
    status: 'clean',
    cx: 95,
    cy: 255,
    inboundDeps: ['main', 'auth'],
    outboundDeps: [],
    description: 'User, session, and project persistence models with strict ownership separation.',
  },
  {
    id: 'waves',
    name: 'plan/waves.py',
    role: 'Modernization Waves',
    status: 'clean',
    cx: 250,
    cy: 295,
    inboundDeps: ['cycle'],
    outboundDeps: [],
    description: 'Topological wave sequencing ordering refactoring steps from leaf nodes to root.',
  },
];

interface Edge {
  from: string;
  to: string;
}

const EDGES: Edge[] = [
  { from: 'main', to: 'auth' },
  { from: 'main', to: 'ast' },
  { from: 'main', to: 'user' },
  { from: 'main', to: 'cycle' },
  { from: 'auth', to: 'user' },
  { from: 'ast', to: 'cycle' },
  { from: 'cycle', to: 'waves' },
];

export const Architecture3DScene: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('main');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const activeNodeId = hoveredNodeId || selectedNodeId;
  const selectedNode = MODULES.find((m) => m.id === selectedNodeId) || MODULES[0];

  const isEdgeHighlighted = (edge: Edge) => {
    return edge.from === activeNodeId || edge.to === activeNodeId;
  };

  const isEdgeFaded = (edge: Edge) => {
    if (!activeNodeId) return false;
    return edge.from !== activeNodeId && edge.to !== activeNodeId;
  };

  return (
    <div className={`w-full flex flex-col items-center select-none ${className}`}>
      {/* Legend & Illustrative Tag */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 px-1 pb-3 text-[11px] font-mono border-b border-[#ECE5DA]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#181715]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#181715]" />
            <span>Core Hub</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#4C4FD6]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4C4FD6]" />
            <span>Clean AST</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#B88228]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B88228]" />
            <span>Circular Risk</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#5C554D] bg-[#ECE5DA]/60 px-2 py-0.5 rounded-md">
          <Info className="w-3 h-3 text-[#4C4FD6]" />
          <span>Interactive Model</span>
        </div>
      </div>

      {/* Interactive Topology Graph Area */}
      <div
        className="w-full relative my-2 bg-gradient-to-b from-[#F5F1E9]/40 to-[#FFFDFC] rounded-2xl p-2 sm:p-3 overflow-hidden border border-[#ECE5DA]"
        role="region"
        aria-label="Repository Architecture Topology Map"
      >
        <svg
          viewBox="0 0 500 330"
          className="w-full h-auto max-h-[300px] overflow-visible"
          aria-hidden="true"
        >
          <defs>
            {/* Standard Directed Edge Arrow */}
            <marker
              id="arrow-indigo"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4C4FD6" />
            </marker>

            {/* Warning Edge Arrow */}
            <marker
              id="arrow-warning"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#B88228" />
            </marker>

            {/* Faded Arrow */}
            <marker
              id="arrow-faded"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#C8BEB0" />
            </marker>
          </defs>

          {/* Dependency Connections */}
          {EDGES.map((edge) => {
            const source = MODULES.find((m) => m.id === edge.from)!;
            const target = MODULES.find((m) => m.id === edge.to)!;
            const highlighted = isEdgeHighlighted(edge);
            const faded = isEdgeFaded(edge);
            const isWarning = edge.to === 'cycle' || edge.from === 'cycle';

            let strokeColor = '#C8BEB0';
            let strokeWidth = 1.25;
            let marker = 'url(#arrow-faded)';

            if (highlighted) {
              strokeColor = isWarning ? '#B88228' : '#4C4FD6';
              strokeWidth = 2.25;
              marker = isWarning ? 'url(#arrow-warning)' : 'url(#arrow-indigo)';
            } else if (faded) {
              strokeColor = '#ECE5DA';
              strokeWidth = 1;
            }

            return (
              <g key={`${edge.from}->${edge.to}`}>
                <line
                  x1={source.cx}
                  y1={source.cy}
                  x2={target.cx}
                  y2={target.cy}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={highlighted && !prefersReducedMotion ? '5,3' : undefined}
                  markerEnd={marker}
                  className="transition-all duration-200"
                />
              </g>
            );
          })}

          {/* Interactive Nodes */}
          {MODULES.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const isConnectedToActive =
              activeNodeId === node.id ||
              EDGES.some(
                (e) =>
                  (e.from === activeNodeId && e.to === node.id) ||
                  (e.to === activeNodeId && e.from === node.id)
              );

            const isCore = node.status === 'core';
            const isWarning = node.status === 'warning';

            return (
              <g
                key={node.id}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`Module: ${node.name}, Role: ${node.role}`}
                onClick={() => setSelectedNodeId(node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onFocus={() => {
                  setHoveredNodeId(node.id);
                  setSelectedNodeId(node.id);
                }}
                onBlur={() => setHoveredNodeId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedNodeId(node.id);
                  }
                }}
                className="cursor-pointer focus:outline-none group"
              >
                {/* Selection halo */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r={isCore ? 32 : 24}
                    fill={isCore ? '#181715' : isWarning ? '#B88228' : '#4C4FD6'}
                    fillOpacity={0.12}
                    className="transition-all duration-300 animate-pulse"
                  />
                )}

                {/* Node Body */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={isCore ? 24 : 17}
                  fill={isCore ? '#181715' : isWarning ? '#FFFDFC' : '#FFFDFC'}
                  stroke={
                    isSelected
                      ? isWarning
                        ? '#B88228'
                        : '#4C4FD6'
                      : isCore
                      ? '#181715'
                      : isWarning
                      ? '#B88228'
                      : isConnectedToActive
                      ? '#4C4FD6'
                      : '#C8BEB0'
                  }
                  strokeWidth={isSelected ? 3 : isCore ? 2 : 1.75}
                  className="transition-all duration-200 group-hover:scale-105"
                />

                {/* Inner Icon / Badge */}
                {isCore ? (
                  <text
                    x={node.cx}
                    y={node.cy + 4}
                    textAnchor="middle"
                    fill="#FFFDFC"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    ROOT
                  </text>
                ) : isWarning ? (
                  <circle cx={node.cx} cy={node.cy} r={5} fill="#B88228" />
                ) : (
                  <circle cx={node.cx} cy={node.cy} r={4.5} fill="#4C4FD6" />
                )}

                {/* Node Label Pill */}
                <g transform={`translate(${node.cx}, ${isCore ? node.cy + 34 : node.cy + 25})`}>
                  <rect
                    x={-(node.name.length * 3.6 + 8)}
                    y="-9"
                    width={node.name.length * 7.2 + 16}
                    height="18"
                    rx="9"
                    fill={isSelected ? '#181715' : '#FFFDFC'}
                    stroke={isSelected ? '#181715' : '#C8BEB0'}
                    strokeWidth={isSelected ? 1.5 : 1}
                    className="shadow-xs transition-colors"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill={isSelected ? '#FFFDFC' : '#181715'}
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {node.name}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic Details Panel matching currently selected node */}
      <div
        className="w-full mt-1 p-3.5 sm:p-4 rounded-2xl bg-[#FFFDFC] border border-[#C8BEB0] shadow-xs text-left transition-all"
        aria-live="polite"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#ECE5DA]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                selectedNode.status === 'core'
                  ? 'bg-[#181715] text-[#FFFDFC]'
                  : selectedNode.status === 'warning'
                  ? 'bg-[#B88228]/15 text-[#B88228] border border-[#B88228]/30'
                  : 'bg-[#EAE9FB] text-[#4C4FD6] border border-[#4C4FD6]/30'
              }`}
            >
              {selectedNode.status === 'core' ? (
                <Layers className="w-3.5 h-3.5" />
              ) : selectedNode.status === 'warning' ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
            </div>

            <div className="min-w-0 truncate">
              <h4 className="font-mono text-xs sm:text-sm font-bold text-[#181715] truncate">
                {selectedNode.name}
              </h4>
              <p className="text-[11px] text-[#5C554D] truncate">{selectedNode.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                selectedNode.status === 'core'
                  ? 'bg-[#181715] text-[#FFFDFC]'
                  : selectedNode.status === 'warning'
                  ? 'bg-[#B88228]/15 text-[#B88228] border border-[#B88228]/30'
                  : 'bg-[#EAE9FB] text-[#4C4FD6] border border-[#4C4FD6]/30'
              }`}
            >
              {selectedNode.status === 'core'
                ? 'Core Root'
                : selectedNode.status === 'warning'
                ? 'Cycle Risk'
                : 'Clean AST'}
            </span>
          </div>
        </div>

        {/* Description & Dependency Summary */}
        <p className="text-xs text-[#5C554D] leading-relaxed mb-3">
          {selectedNode.description}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#ECE5DA] text-[11px] font-mono text-[#5C554D]">
          <div className="flex items-center gap-3">
            <span>
              Inbound: <strong className="text-[#181715]">{selectedNode.inboundDeps.length}</strong>
            </span>
            <span>•</span>
            <span>
              Outbound: <strong className="text-[#181715]">{selectedNode.outboundDeps.length}</strong>
            </span>
          </div>

          <span className="text-[10px] text-[#A39888]">
            Click or Tab to inspect surrounding modules
          </span>
        </div>
      </div>
    </div>
  );
};

export default Architecture3DScene;
