import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  Database,
  Terminal,
  Activity,
  Workflow,
  Sparkles,
  Shield,
  FileCode,
  Flame,
} from 'lucide-react';
import { SubsystemHealth, TabType } from '../../types';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

interface ArchitectureHealthMapProps {
  subsystems: SubsystemHealth[];
  lensMode: 'health' | 'confidence';
  onNavigateTab?: (tab: TabType) => void;
}

export const ArchitectureHealthMap: React.FC<ArchitectureHealthMapProps> = ({
  subsystems,
  lensMode: _lensMode,
  onNavigateTab,
}) => {
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string>(
    subsystems[0]?.id || 'backend'
  );

  // Subsystem icons & descriptions
  const getSubsystemMeta = (id: string) => {
    switch (id) {
      case 'frontend':
        return {
          icon: Layers,
          label: 'Frontend UI',
          role: 'Client interfaces, views & routing',
        };
      case 'backend':
        return {
          icon: Cpu,
          label: 'Backend & APIs',
          role: 'Core application services & endpoints',
        };
      case 'ml':
        return {
          icon: Sparkles,
          label: 'ML & Pipelines',
          role: 'Data processing & inference models',
        };
      case 'database':
        return {
          icon: Database,
          label: 'Persistence & Schema',
          role: 'Data models, ORM & persistence layer',
        };
      case 'infrastructure':
        return {
          icon: Terminal,
          label: 'Infrastructure',
          role: 'Build configurations, containers & scripts',
        };
      default:
        return {
          icon: FileCode,
          label: id,
          role: 'Modular subsystem component',
        };
    }
  };

  const getHealthTone = (score: number): 'green' | 'indigo' | 'amber' | 'red' => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'indigo';
    if (score >= 45) return 'amber';
    return 'red';
  };

  const totalFiles = subsystems.reduce((sum, s) => sum + s.fileCount, 0);
  const avgHealth = Math.round(
    subsystems.length > 0
      ? subsystems.reduce((sum, s) => sum + s.healthScore, 0) / subsystems.length
      : 74
  );

  const selectedSub = subsystems.find((s) => s.id === selectedSubsystemId) || subsystems[0];
  const selectedMeta = selectedSub ? getSubsystemMeta(selectedSub.id) : null;

  return (
    <Card variant="primary" padding="lg" className="space-y-5">
      {/* 1. Header with Compact Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-ink font-display tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-surface border border-indigo/20 flex items-center justify-center text-indigo">
              <Workflow className="w-4 h-4" />
            </div>
            <span>Architecture Health Map</span>
          </h3>
          <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
            Structural topology across core subsystems, boundary health, and downstream pressure indicators.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs bg-tile border border-line px-3 py-1.5 rounded-lg self-start sm:self-auto shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal" />
            <span className="text-[11px] text-ink-2 font-medium">Healthy (&ge;80)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber" />
            <span className="text-[11px] text-ink-2 font-medium">Attention (50-79)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red" />
            <span className="text-[11px] text-ink-2 font-medium">Pressure (&lt;50)</span>
          </div>
        </div>
      </div>

      {/* 2. Codebase Core Topology Overview Banner */}
      <div className="p-4 rounded-xl bg-tile border border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-indigo shadow-xs shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-extrabold text-sm text-ink">
                Codebase Core Architecture
              </span>
              <Badge tone="indigo" size="sm">
                {subsystems.length} Subsystems
              </Badge>
              <Badge tone="neutral" size="sm">
                {totalFiles} Total Files
              </Badge>
            </div>
            <p className="text-xs text-ink-3 mt-0.5">
              Select any architectural subsystem card below to inspect grounded metrics, callers, and risk indicators.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
              Average Subsystem Health
            </span>
            <span className="font-mono text-base font-extrabold text-ink">
              {avgHealth} <span className="text-xs font-semibold text-ink-4">/100</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Structured Subsystem Grid Cards (Clean, Organized, Responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {subsystems.map((sub) => {
          const meta = getSubsystemMeta(sub.id);
          const Icon = meta.icon;
          const isSelected = selectedSubsystemId === sub.id;
          const tone = getHealthTone(sub.healthScore);

          return (
            <div
              key={sub.id}
              onClick={() => setSelectedSubsystemId(sub.id)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-surface border-indigo ring-2 ring-indigo/20 shadow-1 -translate-y-0.5'
                  : 'bg-surface border-line hover:border-line-strong hover:shadow-xs hover:-translate-y-0.5'
              }`}
            >
              <div>
                {/* Header: Icon + Name + File Count */}
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-indigo-surface text-indigo border-indigo/25'
                          : 'bg-tile text-ink-2 border-line'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-ink font-sans truncate" title={meta.label}>
                      {meta.label}
                    </span>
                  </div>

                  <span className="font-mono text-[10px] text-ink-3 px-1.5 py-0.5 rounded bg-tile border border-line shrink-0">
                    {sub.fileCount}f
                  </span>
                </div>

                {/* Health Score Pill */}
                <div className="flex items-baseline justify-between mt-2.5 pt-2 border-t border-line/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                    Health
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-lg font-extrabold text-ink">
                      {sub.healthScore}
                    </span>
                    <span className="text-[10px] text-ink-4">/100</span>
                  </div>
                </div>

                {/* Subsystem Health Badge */}
                <div className="mt-1.5 flex items-center justify-between">
                  <Badge tone={tone} size="sm">
                    {sub.healthScore >= 80 ? 'Healthy' : sub.healthScore >= 60 ? 'Attention' : 'Pressure'}
                  </Badge>
                  <span className="text-[10px] font-mono text-ink-3">
                    {sub.confidence} conf
                  </span>
                </div>
              </div>

              {/* Bottom Grounded Status */}
              <div className="mt-3 pt-2.5 border-t border-line/60 text-[11px] text-ink-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span>High Risk Files:</span>
                  <strong className={sub.highRiskFiles > 0 ? 'text-amber-strong font-mono' : 'text-ink font-mono'}>
                    {sub.highRiskFiles}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Unresolved Imports:</span>
                  <strong className={sub.unresolvedDependencies > 0 ? 'text-amber-strong font-mono' : 'text-ink font-mono'}>
                    {sub.unresolvedDependencies}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Subsystem Detailed Inspection Section */}
      {selectedSub && selectedMeta && (
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-line shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3.5 border-b border-line">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-surface border border-indigo/20 flex items-center justify-center text-indigo shrink-0">
                <selectedMeta.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-display font-bold text-sm sm:text-base text-ink">
                    Subsystem Inspection: {selectedMeta.label}
                  </h4>
                  <Badge tone={getHealthTone(selectedSub.healthScore)} size="sm">
                    Health: {selectedSub.healthScore}/100
                  </Badge>
                  <Badge tone="neutral" size="sm">
                    {selectedSub.fileCount} Source Files
                  </Badge>
                  <Badge tone={selectedSub.confidence === 'high' ? 'green' : 'amber'} size="sm">
                    {selectedSub.confidence} Confidence
                  </Badge>
                </div>
                <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
                  {selectedMeta.role} &bull; Contains {selectedSub.highRiskFiles} high-risk modules and {selectedSub.unprotectedFiles} unprotected files.
                </p>
              </div>
            </div>

            {/* Quick Navigation Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab?.('explanation')}
                icon={<Workflow className="w-3.5 h-3.5 text-indigo" />}
                className="text-xs bg-surface"
              >
                Architecture
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab?.('hotspots')}
                icon={<Flame className="w-3.5 h-3.5 text-amber-strong" />}
                className="text-xs bg-surface"
              >
                Hotspots
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab?.('graph')}
                icon={<Layers className="w-3.5 h-3.5 text-indigo" />}
                className="text-xs bg-surface"
              >
                Dependency Map
              </Button>
              <Button
                variant="indigo"
                size="sm"
                onClick={() => onNavigateTab?.('tests')}
                icon={<Shield className="w-3.5 h-3.5" />}
                className="text-xs font-semibold"
              >
                Safety Tests
              </Button>
            </div>
          </div>

          {/* 5-Metric Grounded KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg bg-tile border border-line">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                AST Coverage
              </span>
              <span className="font-mono text-base font-bold text-ink mt-0.5 block">
                {selectedSub.fullParseCoverage}%
              </span>
              <span className="text-[10px] text-ink-3">Grounded syntax trees</span>
            </div>

            <div className="p-3 rounded-lg bg-tile border border-line">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                High Risk Modules
              </span>
              <span className={`font-mono text-base font-bold mt-0.5 block ${selectedSub.highRiskFiles > 0 ? 'text-amber-strong' : 'text-ink'}`}>
                {selectedSub.highRiskFiles}
              </span>
              <span className="text-[10px] text-ink-3">Prone to regressions</span>
            </div>

            <div className="p-3 rounded-lg bg-tile border border-line">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                Unresolved Imports
              </span>
              <span className={`font-mono text-base font-bold mt-0.5 block ${selectedSub.unresolvedDependencies > 0 ? 'text-amber-strong' : 'text-ink'}`}>
                {selectedSub.unresolvedDependencies}
              </span>
              <span className="text-[10px] text-ink-3">External or ambiguous</span>
            </div>

            <div className="p-3 rounded-lg bg-tile border border-line">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                Unprotected Files
              </span>
              <span className={`font-mono text-base font-bold mt-0.5 block ${selectedSub.unprotectedFiles > 0 ? 'text-amber-strong' : 'text-ink'}`}>
                {selectedSub.unprotectedFiles}
              </span>
              <span className="text-[10px] text-ink-3">Lacking characterization</span>
            </div>

            <div className="p-3 rounded-lg bg-tile border border-line">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                Modernization Targets
              </span>
              <span className="font-mono text-base font-bold text-indigo mt-0.5 block">
                {selectedSub.modernizationCandidates}
              </span>
              <span className="text-[10px] text-ink-3">Eligible for proposals</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ArchitectureHealthMap;
