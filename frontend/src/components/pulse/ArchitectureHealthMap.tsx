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
  Shield,
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
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string | null>(
    subsystems[0]?.id || 'frontend'
  );
  const [hoveredSubsystemId, setHoveredSubsystemId] = useState<string | null>(null);

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

  // Deterministic orbital layout centered around Codebase Core (cx=380, cy=230)
  // viewBox="0 0 760 460"
  const nodePositions: Record<string, { x: number; y: number; labelPos: 'top' | 'right' | 'bottom' | 'left' }> = {
    frontend: { x: 380, y: 70, labelPos: 'top' },
    backend: { x: 590, y: 125, labelPos: 'right' },
    ml: { x: 575, y: 330, labelPos: 'right' },
    database: { x: 185, y: 330, labelPos: 'left' },
    infrastructure: { x: 170, y: 125, labelPos: 'left' },
  };

  const getConfidenceBorderClass = (conf: string) => {
    const c = conf.toLowerCase();
    if (c === 'high') return 'border-solid border-[#3BA7F2]';
    if (c === 'medium') return 'border-dashed border-[#F59E0B]';
    return 'border-dotted border-[#DC2626]';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#167C69]';
    if (score >= 70) return 'text-[#0B3D91]';
    if (score >= 50) return 'text-[#D97706]';
    return 'text-[#DC2626]';
  };

  const getPressureHalo = (score: number) => {
    if (score >= 80) return 'shadow-[0_4px_20px_rgba(127,231,214,0.3)] border-[#7FE7D6]';
    if (score >= 70) return 'shadow-[0_4px_20px_rgba(59,167,242,0.25)] border-[#3BA7F2]/60';
    if (score >= 50) return 'shadow-[0_4px_20px_rgba(217,119,6,0.25)] border-[#D97706]/70';
    return 'shadow-[0_4px_20px_rgba(220,38,38,0.28)] border-[#DC2626]';
  };

  const totalFiles = subsystems.reduce((sum, s) => sum + s.fileCount, 0);
  const avgHealth = Math.round(
    subsystems.length > 0
      ? subsystems.reduce((sum, s) => sum + s.healthScore, 0) / subsystems.length
      : 74
  );

  const selectedSub = subsystems.find((s) => s.id === selectedSubsystemId) || subsystems[0];
  const hoveredSub = subsystems.find((s) => s.id === hoveredSubsystemId);

  return (
    <section
      className="bg-white border border-[#D7EAF5] rounded-[20px] shadow-[0_8px_28px_rgba(11,61,145,0.06)] p-6 sm:p-7 transition-all"
      aria-label="Architecture Health Map"
    >
      {/* Header with Compact Integrated Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D7EAF5]">
        <div>
          <h3 className="text-lg font-bold text-[#102536] tracking-tight font-display flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91]">
              <Activity className="w-4 h-4" />
            </div>
            <span>Architecture Health Map</span>
          </h3>
          <p className="text-xs text-[#52697A] mt-1">
            Radial architectural topology connecting core systems with perimeter subsystem health, boundary confidence, and pressure indicators.
          </p>
        </div>

        {/* Compact Integrated Legend (Section 16) */}
        <div className="flex items-center gap-4 text-xs text-[#52697A] bg-[#F7FBFF] border border-[#D7EAF5] px-3 py-1.5 rounded-xl self-start sm:self-auto shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#102536]">Confidence:</span>
            <span className="flex items-center gap-1 font-mono text-[11px]" title="High Confidence">
              <span className="w-3 h-0.5 bg-[#3BA7F2] inline-block" /> High
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px]" title="Medium Confidence">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-[#F59E0B] inline-block" /> Med
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px]" title="Low Confidence">
              <span className="w-3 h-0.5 border-t-2 border-dotted border-[#DC2626] inline-block" /> Low
            </span>
          </div>

          <span className="text-[#D7EAF5] select-none" aria-hidden="true">|</span>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#102536]">Health:</span>
            <span className="flex items-center gap-1 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#167C69]" /> Healthy
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" /> Attention
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> Pressure
            </span>
          </div>
        </div>
      </div>

      {/* Desktop / Large Screens Radial Map View (Section 9, 10, 11, 14, 15) */}
      <div className="hidden md:block relative w-full h-[500px] mt-5 overflow-hidden rounded-2xl bg-gradient-to-b from-[#F7FBFF] to-[#EDF6FC] border border-[#D7EAF5]">
        {/* Architectural Concentric Rings & Connection Lines SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 760 460"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Soft Ocean Breeze connection gradient */}
            <linearGradient id="coreConnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B3D91" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3BA7F2" stopOpacity="0.15" />
            </linearGradient>

            <linearGradient id="coreActiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B3D91" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3BA7F2" stopOpacity="0.75" />
            </linearGradient>

            {/* Radial Core Background Depth Gradient */}
            <radialGradient id="mapCenterDepth" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3BA7F2" stopOpacity="0.08" />
              <stop offset="70%" stopColor="#0B3D91" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Faint Architectural Concentric Rings around Core (cx=380, cy=230) */}
          <circle cx="380" cy="230" r="320" fill="url(#mapCenterDepth)" />
          <circle cx="380" cy="230" r="110" fill="none" stroke="#D7EAF5" strokeWidth="1.5" strokeOpacity="0.6" />
          <circle cx="380" cy="230" r="190" fill="none" stroke="#D7EAF5" strokeWidth="1" strokeDasharray="5 4" strokeOpacity="0.5" />
          <circle cx="380" cy="230" r="270" fill="none" stroke="#D7EAF5" strokeWidth="1" strokeDasharray="2 4" strokeOpacity="0.4" />

          {/* Non-crossing Soft Curved Cross-Subsystem Relationships */}
          {/* Frontend -> Backend (Web callers to API) */}
          <path
            d="M 380,70 Q 520,70 590,125"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeOpacity="0.3"
          />
          {/* Backend -> ML (Inference pipeline) */}
          <path
            d="M 590,125 Q 610,230 575,330"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeOpacity="0.3"
          />
          {/* Infrastructure -> Database */}
          <path
            d="M 170,125 Q 150,230 185,330"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeOpacity="0.3"
          />

          {/* Primary Core-to-Subsystem Curved Connections (Section 10) */}
          {subsystems.map((sub) => {
            const pos = nodePositions[sub.id] || { x: 380, y: 230 };
            const isSelected = selectedSubsystemId === sub.id;
            const isHovered = hoveredSubsystemId === sub.id;
            const isActive = isSelected || isHovered;

            // Compute subtle cubic or quadratic bezier curve from core (380, 230) to subsystem
            // Offset control point slightly for elegant organic curved line
            const midX = (380 + pos.x) / 2;
            const midY = (230 + pos.y) / 2;
            const ctrlX = midX + (pos.y < 230 ? 15 : -15);
            const ctrlY = midY + (pos.x < 380 ? 15 : -15);

            return (
              <g key={sub.id}>
                {/* Glow under active line */}
                {isActive && (
                  <path
                    d={`M 380,230 Q ${ctrlX},${ctrlY} ${pos.x},${pos.y}`}
                    fill="none"
                    stroke="#7FE7D6"
                    strokeWidth="5"
                    strokeOpacity="0.45"
                    strokeLinecap="round"
                  />
                )}
                <path
                  d={`M 380,230 Q ${ctrlX},${ctrlY} ${pos.x},${pos.y}`}
                  fill="none"
                  stroke={isActive ? 'url(#coreActiveGrad)' : 'url(#coreConnGrad)'}
                  strokeWidth={isActive ? '2.5' : '1.75'}
                  strokeDasharray={isActive ? 'none' : '6 4'}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}
        </svg>

        {/* Center: CODEBASE CORE Node (Section 14) */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-white border-2 border-[#0B3D91] shadow-[0_12px_36px_rgba(11,61,145,0.14)] flex flex-col items-center justify-center text-center p-3.5 select-none z-20 cursor-default"
          style={{ left: '380px', top: '230px' }}
        >
          {/* Concentric inner depth pulse */}
          <div className="w-8 h-8 rounded-full bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91] mb-1 shadow-xs border border-[#3BA7F2]/30">
            <Cpu className="w-4 h-4" />
          </div>

          <span className="text-[11px] font-extrabold tracking-wider text-[#102536] uppercase font-display leading-tight">
            Codebase Core
          </span>

          <span className="text-[10px] font-medium text-[#52697A] mt-0.5">
            {totalFiles} modules
          </span>

          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#E8F6FF] text-[#0B3D91] border border-[#3BA7F2]/30">
              5 Subsystems
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F0FDF4] text-[#167C69] border border-[#86EFAC]">
              {avgHealth}H
            </span>
          </div>
        </div>

        {/* Orbital Subsystem Nodes (Section 11, 12, 13) */}
        {subsystems.map((sub, idx) => {
          const pos = nodePositions[sub.id] || { x: 380, y: 230 };
          const Icon = getSubsystemIcon(sub.id);
          const isSelected = selectedSubsystemId === sub.id;
          const isHovered = hoveredSubsystemId === sub.id;
          const haloClass = getPressureHalo(sub.healthScore);
          const borderClass = getConfidenceBorderClass(sub.confidence);

          // Subsystem card width & height (compact and balanced)
          const cardWidth = 158;
          const cardHeight = 118;

          return (
            <div
              key={sub.id}
              onClick={() => setSelectedSubsystemId(sub.id)}
              onMouseEnter={() => setHoveredSubsystemId(sub.id)}
              onMouseLeave={() => setHoveredSubsystemId(null)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border-2 transition-all duration-250 p-3 flex flex-col justify-between cursor-pointer select-none z-30 ${haloClass} ${borderClass} ${
                isSelected
                  ? 'ring-3 ring-[#0B3D91] ring-offset-2 scale-105 opacity-100 z-40'
                  : isHovered
                  ? 'scale-105 opacity-100'
                  : 'opacity-90 hover:opacity-100'
              }`}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                animationDelay: `${idx * 90}ms`,
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedSubsystemId(sub.id);
                }
              }}
              aria-label={`Inspect ${sub.label} subsystem. Health score ${sub.healthScore}.`}
            >
              {/* Node Header: Icon, Label & File Count */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91] shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#102536] truncate tracking-tight font-sans">
                    {sub.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F7FBFF] text-[#52697A] border border-[#D7EAF5] shrink-0">
                  {sub.fileCount}F
                </span>
              </div>

              {/* Node Center: Health Score or Confidence Mode */}
              <div className="my-0.5 flex flex-col items-center justify-center">
                {lensMode === 'health' ? (
                  <>
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-2xl font-black font-display tracking-tight leading-none ${getScoreColor(sub.healthScore)}`}>
                        {sub.healthScore}
                      </span>
                      <span className="text-[10px] font-bold text-[#94A3B8]">/100</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#52697A] font-sans mt-0.5">
                      Health
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`text-xs font-bold uppercase tracking-wider font-mono ${
                      sub.confidence === 'high' ? 'text-[#167C69]' : sub.confidence === 'medium' ? 'text-[#D97706]' : 'text-[#DC2626]'
                    }`}>
                      {sub.confidence}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#52697A] font-sans mt-0.5">
                      Confidence
                    </span>
                  </>
                )}
              </div>

              {/* Node Footer: 2 Primary Pressure Indicators */}
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-[#52697A] border-t border-[#D7EAF5] pt-1.5">
                <div title={`${sub.highRiskFiles} elevated or critical risk files`} className="flex items-center gap-1 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sub.highRiskFiles > 0 ? 'bg-[#DC2626]' : 'bg-[#167C69]'}`} />
                  <span className="truncate">{sub.highRiskFiles} risk</span>
                </div>
                <div title={`${sub.unresolvedDependencies} unresolved local imports`} className="flex items-center gap-1 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sub.unresolvedDependencies > 0 ? 'bg-[#D97706]' : 'bg-[#167C69]'}`} />
                  <span className="truncate">{sub.unresolvedDependencies} unres</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Hover Tooltip Overlay when a node is hovered */}
        {hoveredSub && (
          <div
            className="absolute bottom-3 left-4 z-40 bg-white/95 backdrop-blur-sm border border-[#D7EAF5] rounded-xl px-3.5 py-2 shadow-sm text-xs text-[#102536] flex items-center gap-3 animate-[fade-up_100ms_ease-out_both] pointer-events-none"
          >
            <div className="font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3BA7F2]" />
              <span>{hoveredSub.label}</span>
            </div>
            <span className="text-[#D7EAF5]">|</span>
            <span className="text-[#52697A]">
              Health: <strong className={getScoreColor(hoveredSub.healthScore)}>{hoveredSub.healthScore}</strong>
            </span>
            <span className="text-[#D7EAF5]">|</span>
            <span className="text-[#52697A]">
              Risk: <strong className="text-[#102536]">{hoveredSub.highRiskFiles}</strong>
            </span>
            <span className="text-[#D7EAF5]">|</span>
            <span className="text-[#52697A]">
              Unresolved: <strong className="text-[#102536]">{hoveredSub.unresolvedDependencies}</strong>
            </span>
            <span className="text-[#D7EAF5]">|</span>
            <span className="text-[#52697A]">
              Confidence: <strong className="capitalize text-[#102536]">{hoveredSub.confidence}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Mobile & Small Screen Stacked Subsystem List (Responsive Fallback) */}
      <div className="block md:hidden mt-4 space-y-3">
        <div className="bg-[#F7FBFF] border border-[#D7EAF5] rounded-xl p-3 text-center">
          <div className="text-xs font-bold text-[#102536]">
            Codebase Core Overview &bull; {totalFiles} modules across 5 subsystems
          </div>
          <p className="text-[11px] text-[#52697A] mt-0.5">
            Select a subsystem below to inspect detailed health indicators and actions.
          </p>
        </div>

        <div className="space-y-2.5">
          {subsystems.map((sub) => {
            const Icon = getSubsystemIcon(sub.id);
            const isSelected = selectedSubsystemId === sub.id;
            const haloClass = getPressureHalo(sub.healthScore);
            const borderClass = getConfidenceBorderClass(sub.confidence);

            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubsystemId(sub.id)}
                className={`p-3.5 rounded-xl bg-white border-2 transition-all cursor-pointer ${haloClass} ${borderClass} ${
                  isSelected ? 'ring-2 ring-[#0B3D91]' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#102536]">{sub.label}</div>
                      <div className="text-[10px] text-[#52697A] font-mono">{sub.fileCount} source files</div>
                    </div>
                  </div>

                  <div className="text-right">
                    {lensMode === 'health' ? (
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className={`text-xl font-bold font-display ${getScoreColor(sub.healthScore)}`}>
                          {sub.healthScore}
                        </span>
                        <span className="text-[10px] text-[#94A3B8]">/100</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold font-mono uppercase text-[#102536]">
                        {sub.confidence}
                      </span>
                    )}
                    <span className="text-[10px] uppercase text-[#52697A] font-semibold block">
                      {lensMode === 'health' ? 'Health' : 'Confidence'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-[#D7EAF5] text-[10px] font-mono text-[#52697A]">
                  <div>High Risk: <strong className="text-[#102536]">{sub.highRiskFiles}</strong></div>
                  <div>Unresolved: <strong className="text-[#102536]">{sub.unresolvedDependencies}</strong></div>
                  <div>Unprotected: <strong className="text-[#102536]">{sub.unprotectedFiles}</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subsystem Inspection Panel (Section 17) */}
      {selectedSub && (
        <div className="mt-5 p-5 rounded-2xl bg-[#F7FBFF] border border-[#D7EAF5] shadow-xs animate-[fade-up_200ms_ease-out_both]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#D7EAF5]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider">
                  Subsystem Inspection:
                </span>
                <span className="text-sm font-extrabold text-[#102536] font-display">
                  {selectedSub.label}
                </span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white border border-[#D7EAF5] text-[#102536] font-semibold">
                  {selectedSub.fileCount} source files
                </span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#E8F6FF] border border-[#3BA7F2]/30 text-[#0B3D91] font-bold">
                  Health: {selectedSub.healthScore}/100
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white border border-[#D7EAF5] text-[#52697A] capitalize">
                  {selectedSub.confidence} confidence
                </span>
              </div>
              <p className="text-xs text-[#52697A] leading-relaxed">
                Contains {selectedSub.highRiskFiles} high-risk modules, {selectedSub.unresolvedDependencies} unresolved imports, and {selectedSub.unprotectedFiles} unprotected files with {selectedSub.fullParseCoverage}% full AST coverage.
              </p>
            </div>

            {/* Subsystem Actions (Section 17) */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {onNavigateTab && (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('explanation')}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#0B3D91] hover:bg-[#E8F6FF] border border-[#D7EAF5] shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Workflow className="w-3.5 h-3.5 text-[#0B3D91]" />
                    <span>Architecture</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('hotspots')}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#B45309] hover:bg-[#FEF3C7] border border-[#FCD34D] shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-[#B45309]" />
                    <span>Subsystem Hotspots</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('graph')}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#102536] hover:bg-[#E8F6FF] border border-[#D7EAF5] shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5 text-[#0B3D91]" />
                    <span>Dependency Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('tests')}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0B3D91] text-white hover:bg-[#1E40AF] shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Safety Tests</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 5 Subsystem Metrics Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-xs">
            <div className="bg-white border border-[#D7EAF5] p-3 rounded-xl">
              <div className="text-[11px] text-[#52697A] font-medium">AST Coverage</div>
              <div className="text-sm font-bold font-mono text-[#102536] mt-0.5">{selectedSub.fullParseCoverage}%</div>
            </div>
            <div className="bg-white border border-[#D7EAF5] p-3 rounded-xl">
              <div className="text-[11px] text-[#52697A] font-medium">High Risk Modules</div>
              <div className={`text-sm font-bold font-mono mt-0.5 ${selectedSub.highRiskFiles > 0 ? 'text-[#DC2626]' : 'text-[#167C69]'}`}>
                {selectedSub.highRiskFiles}
              </div>
            </div>
            <div className="bg-white border border-[#D7EAF5] p-3 rounded-xl">
              <div className="text-[11px] text-[#52697A] font-medium">Unresolved Imports</div>
              <div className={`text-sm font-bold font-mono mt-0.5 ${selectedSub.unresolvedDependencies > 0 ? 'text-[#D97706]' : 'text-[#167C69]'}`}>
                {selectedSub.unresolvedDependencies}
              </div>
            </div>
            <div className="bg-white border border-[#D7EAF5] p-3 rounded-xl">
              <div className="text-[11px] text-[#52697A] font-medium">Unprotected Modules</div>
              <div className={`text-sm font-bold font-mono mt-0.5 ${selectedSub.unprotectedFiles > 0 ? 'text-[#D97706]' : 'text-[#167C69]'}`}>
                {selectedSub.unprotectedFiles}
              </div>
            </div>
            <div className="bg-white border border-[#D7EAF5] p-3 rounded-xl">
              <div className="text-[11px] text-[#52697A] font-medium">Modernization Targets</div>
              <div className="text-sm font-bold font-mono text-[#0B3D91] mt-0.5">{selectedSub.modernizationCandidates}</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ArchitectureHealthMap;
