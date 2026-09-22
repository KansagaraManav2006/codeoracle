import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  Database,
  Terminal,
  Activity,
  ShieldAlert,
  FileCode,
  Workflow,
  Sparkles,
} from 'lucide-react';
import { SubsystemHealth, TabType } from '../../types';

interface ArchitectureHealthMapProps {
  subsystems: SubsystemHealth[];
  lensMode: 'health' | 'confidence';
  onNavigateTab?: (tab: TabType) => void;
}

export const ArchitectureHealthMap: React.FC<ArchitectureHealthMapProps> = ({
  subsystems,
  lensMode,
  onNavigateTab,
}) => {
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string | null>(null);

  // Subsystem icons
  const getSubsystemIcon = (id: string) => {
    switch (id) {
      case 'frontend':
        return Layers;
      case 'backend':
        return Cpu;
      case 'ml':
        return Sparkles;
      case 'database':
        return Database;
      case 'infrastructure':
        return Terminal;
      default:
        return FileCode;
    }
  };

  // Subsystem positions around center (CODEBASE CORE at cx=300, cy=240, r=160)
  // 5 nodes at angles: -90 (top: backend), -18 (top-right: ml), 54 (bottom-right: database), 126 (bottom-left: infrastructure), 198 (top-left: frontend)
  const nodePositions: Record<string, { x: number; y: number }> = {
    backend: { x: 300, y: 70 },
    ml: { x: 470, y: 170 },
    database: { x: 420, y: 360 },
    infrastructure: { x: 180, y: 360 },
    frontend: { x: 130, y: 170 },
  };

  const getConfidenceBorderClass = (conf: string) => {
    if (conf === 'high') return 'border-solid border-line-strong';
    if (conf === 'medium') return 'border-dashed border-amber-strong/60';
    return 'border-dotted border-red-strong/70';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-teal-strong';
    if (score >= 70) return 'text-interactive';
    if (score >= 50) return 'text-amber-strong';
    return 'text-red-strong';
  };

  const getPressureHalo = (score: number) => {
    if (score >= 80) return 'shadow-[0_0_15px_rgba(13,148,136,0.18)] border-teal/40';
    if (score >= 70) return 'shadow-[0_0_15px_rgba(29,78,216,0.18)] border-interactive/40';
    if (score >= 50) return 'shadow-[0_0_18px_rgba(217,119,6,0.22)] border-amber-strong/50';
    return 'shadow-[0_0_20px_rgba(220,38,38,0.25)] border-red-strong/50';
  };

  const selectedSub = subsystems.find((s) => s.id === selectedSubsystemId) || subsystems[0];

  return (
    <div className="bg-surface border border-line rounded-card shadow-1 p-6 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <h3 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-interactive" />
            Architecture Health Map
          </h3>
          <p className="text-xs text-ink-3 mt-0.5">
            Macro subsystem topology displaying health halo pressure and confidence boundary encoding.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-ink-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-solid border-line-strong" />
            <span>High Conf</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-amber-strong" />
            <span>Medium Conf</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dotted border-red-strong" />
            <span>Low Conf</span>
          </div>
        </div>
      </div>

      {/* Desktop / Large Screens Radial Map View (Hidden on mobile) */}
      <div className="hidden md:block relative w-full h-[470px] mt-4 overflow-hidden rounded-lg bg-panel/20 border border-line/70">
        {/* Soft Connecting Lines SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 460">
          <defs>
            <linearGradient id="coreLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Lines connecting CODEBASE CORE (300, 230) to each subsystem node */}
          {subsystems.map((sub) => {
            const pos = nodePositions[sub.id] || { x: 300, y: 230 };
            return (
              <g key={sub.id}>
                <line
                  x1="300"
                  y1="230"
                  x2={pos.x}
                  y2={pos.y}
                  stroke="url(#coreLineGrad)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  className="transition-all duration-500"
                />
              </g>
            );
          })}
        </svg>

        {/* CODEBASE CORE Central Node */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-surface border-2 border-interactive shadow-2 flex flex-col items-center justify-center text-center p-3 cursor-default select-none z-10"
          style={{ left: '300px', top: '230px' }}
        >
          <div className="w-7 h-7 rounded-full bg-interactive-surface flex items-center justify-center text-interactive mb-1">
            <Cpu className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-mono font-extrabold tracking-wider text-ink uppercase">
            Codebase Core
          </span>
          <span className="text-[10px] text-ink-3 mt-0.5">Central Hub</span>
          <span className="mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-panel text-ink-2 font-medium">
            5 Subsystems
          </span>
        </div>

        {/* Outer Subsystem Nodes */}
        {subsystems.map((sub) => {
          const pos = nodePositions[sub.id] || { x: 300, y: 230 };
          const Icon = getSubsystemIcon(sub.id);
          const isSelected = selectedSubsystemId === sub.id;

          // Scaled size based on fileCount (min 115px, max 145px)
          const baseSize = sub.fileCount > 0 ? Math.min(145, Math.max(115, 110 + sub.fileCount * 4)) : 105;
          const haloClass = getPressureHalo(sub.healthScore);
          const borderClass = getConfidenceBorderClass(sub.confidence);

          return (
            <div
              key={sub.id}
              onClick={() => setSelectedSubsystemId(sub.id)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface border-2 transition-all duration-300 p-3.5 flex flex-col justify-between cursor-pointer select-none z-20 hover:scale-105 ${haloClass} ${borderClass} ${
                isSelected ? 'ring-2 ring-interactive ring-offset-2' : ''
              }`}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${baseSize}px`,
                minHeight: `${baseSize}px`,
              }}
            >
              {/* Node Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-panel flex items-center justify-center text-ink-2">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-ink tracking-tight">{sub.label}</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-ink-3">
                  {sub.fileCount}f
                </span>
              </div>

              {/* Node Center: Health score or Confidence level */}
              <div className="my-1.5 flex flex-col items-center">
                {lensMode === 'health' ? (
                  <>
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-xl font-extrabold font-mono ${getScoreColor(sub.healthScore)}`}>
                        {sub.healthScore}
                      </span>
                      <span className="text-[10px] text-ink-4">/100</span>
                    </div>
                    <span className="text-[9px] font-mono uppercase text-ink-3 font-medium">Health</span>
                  </>
                ) : (
                  <>
                    <span className={`text-xs font-bold uppercase tracking-wider font-mono ${
                      sub.confidence === 'high' ? 'text-teal-strong' : sub.confidence === 'medium' ? 'text-amber-strong' : 'text-red-strong'
                    }`}>
                      {sub.confidence}
                    </span>
                    <span className="text-[9px] font-mono uppercase text-ink-3 font-medium">Confidence</span>
                  </>
                )}
              </div>

              {/* Node Mini Indicators */}
              <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-ink-3 border-t border-line/60 pt-1.5">
                <div title="High risk modules" className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-strong" />
                  <span>{sub.highRiskFiles} risk</span>
                </div>
                <div title="Unresolved dependencies" className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-strong" />
                  <span>{sub.unresolvedDependencies} unres</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile & Small Screen Stacked Subsystem List (Responsive Fallback) */}
      <div className="block md:hidden mt-4 space-y-3">
        <div className="bg-panel/40 border border-line rounded-lg p-3 text-center">
          <span className="text-xs font-mono font-bold uppercase tracking-wide text-ink-2">
            Codebase Core Overview
          </span>
          <p className="text-[11px] text-ink-3 mt-0.5">
            Showing all 5 architectural subsystems below. Tap to inspect metrics.
          </p>
        </div>

        <div className="space-y-2">
          {subsystems.map((sub) => {
            const Icon = getSubsystemIcon(sub.id);
            const isSelected = selectedSubsystemId === sub.id;
            const haloClass = getPressureHalo(sub.healthScore);
            const borderClass = getConfidenceBorderClass(sub.confidence);

            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubsystemId(sub.id)}
                className={`p-3.5 rounded-xl bg-surface border-2 transition-all cursor-pointer ${haloClass} ${borderClass} ${
                  isSelected ? 'ring-2 ring-interactive' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-panel flex items-center justify-center text-ink-2">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink">{sub.label}</div>
                      <div className="text-[10px] text-ink-3 font-mono">{sub.fileCount} source files</div>
                    </div>
                  </div>

                  <div className="text-right">
                    {lensMode === 'health' ? (
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className={`text-lg font-bold font-mono ${getScoreColor(sub.healthScore)}`}>
                          {sub.healthScore}
                        </span>
                        <span className="text-[10px] text-ink-4">/100</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold font-mono uppercase text-ink-2">
                        {sub.confidence}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-ink-3 uppercase">
                      {lensMode === 'health' ? 'Health' : 'Confidence'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-line text-[10px] font-mono text-ink-3">
                  <div>High Risk: <strong className="text-ink-2">{sub.highRiskFiles}</strong></div>
                  <div>Unresolved: <strong className="text-ink-2">{sub.unresolvedDependencies}</strong></div>
                  <div>Unprotected: <strong className="text-ink-2">{sub.unprotectedFiles}</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Subsystem Detail Card */}
      {selectedSub && (
        <div className="mt-4 p-4 rounded-xl bg-panel/40 border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink uppercase font-mono tracking-wide">
                Subsystem Inspection: {selectedSub.label}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-line text-ink-3">
                {selectedSub.fileCount} files
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-line text-ink-3">
                AST Coverage: {selectedSub.fullParseCoverage}%
              </span>
            </div>
            <p className="text-xs text-ink-3">
              Contains {selectedSub.highRiskFiles} high-risk modules, {selectedSub.unresolvedDependencies} unresolved imports, and {selectedSub.unprotectedFiles} unprotected files.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateTab && (
              <>
                <button
                  onClick={() => onNavigateTab('explanation')}
                  className="px-3 py-1.5 rounded-pill text-xs font-medium bg-surface text-ink hover:bg-panel border border-line shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Workflow className="w-3.5 h-3.5 text-ink-3" />
                  <span>Architecture</span>
                </button>
                <button
                  onClick={() => onNavigateTab('hotspots')}
                  className="px-3 py-1.5 rounded-pill text-xs font-medium bg-surface text-ink hover:bg-panel border border-line shadow-sm transition-all flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-strong" />
                  <span>Subsystem Hotspots</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchitectureHealthMap;
