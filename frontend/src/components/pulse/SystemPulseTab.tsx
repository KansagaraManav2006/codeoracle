import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { SystemPulseResponse, TabType } from '../../types';
import RepositoryHealthHero from './RepositoryHealthHero';
import ArchitectureHealthMap from './ArchitectureHealthMap';
import HealthDimensionCards from './HealthDimensionCards';
import PressureZonesSection from './PressureZonesSection';
import SubsystemHealthMatrix from './SubsystemHealthMatrix';
import IntelligentSignalsSection from './IntelligentSignalsSection';
import NextActionsSection from './NextActionsSection';

interface SystemPulseTabProps {
  projectId: string;
  projectName: string;
  targetFile?: string | null;
  onNavigateTab: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
}

export const SystemPulseTab: React.FC<SystemPulseTabProps> = ({
  projectId,
  projectName,
  targetFile,
  onNavigateTab,
  onSelectFile,
}) => {
  const [data, setData] = useState<SystemPulseResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lensMode, setLensMode] = useState<'health' | 'confidence'>('health');

  const fetchSystemPulse = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/system-pulse`);
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('Analysis required before viewing System Pulse. Please run analysis on the project first.');
        }
        throw new Error(`Failed to load System Pulse data (HTTP ${res.status}).`);
      }
      const json: SystemPulseResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while fetching System Pulse.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSystemPulse();
  }, [fetchSystemPulse]);

  // Loading State
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] text-center p-8 bg-surface border border-line rounded-card shadow-1">
        <Activity className="w-9 h-9 text-interactive animate-pulse mb-3" />
        <h3 className="text-base font-bold text-ink tracking-tight">
          Synthesizing System Pulse
        </h3>
        <p className="text-xs text-ink-3 max-w-md mt-1">
          Observing parsing fidelity, dependency graph topology, test harness protection, and modernization debt...
        </p>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-surface border border-line rounded-card shadow-1">
        <AlertTriangle className="w-8 h-8 text-amber-strong mb-3" />
        <h3 className="text-base font-bold text-ink">Unable to Load Observatory</h3>
        <p className="text-xs text-ink-3 max-w-md mt-1 mb-4">
          {error || 'System Pulse metrics could not be generated for this project.'}
        </p>
        <button
          onClick={fetchSystemPulse}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-interactive text-white hover:bg-interactive-press transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Generation</span>
        </button>
      </div>
    );
  }

  const { health, subsystems, pressureZones, signals, nextActions, confidence } = data;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* 1. Page Header & Lens Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-line rounded-card p-5 shadow-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal animate-pulse" />
            <h1 className="text-xl font-extrabold text-ink tracking-tight">
              SYSTEM PULSE
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-panel border border-line text-ink-3">
              {projectName}
            </span>
            {targetFile && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-interactive-surface border border-interactive/20 text-interactive truncate max-w-[240px]" title={targetFile}>
                Target: {targetFile}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-3 mt-1 font-medium">
            Repository Health Observatory &bull; 30-second multi-dimensional codebase clarity
          </p>
        </div>

        {/* Lens Mode Toggle (HEALTH vs CONFIDENCE) */}
        <div className="flex items-center gap-1 bg-panel p-1 rounded-pill border border-line self-start md:self-center">
          <button
            onClick={() => setLensMode('health')}
            className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition-all ${
              lensMode === 'health'
                ? 'bg-surface text-interactive shadow-sm'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            HEALTH
          </button>
          <button
            onClick={() => setLensMode('confidence')}
            className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition-all ${
              lensMode === 'confidence'
                ? 'bg-surface text-interactive shadow-sm'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            CONFIDENCE
          </button>
        </div>
      </div>

      {/* 2. Incomplete Analysis State Banner (Section 25) */}
      {health.isPartial && (
        <div className="bg-amber-surface/70 border border-amber/40 rounded-card p-4 text-xs text-amber-text flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-strong shrink-0 mt-0.5" />
            <div>
              <div className="font-bold uppercase tracking-wider font-mono text-[11px] text-amber-strong">
                SYSTEM PULSE PARTIAL
              </div>
              <p className="mt-0.5 text-ink-2">
                This repository health assessment contains partial data. Full AST coverage is at{' '}
                <strong className="font-mono">{health.dimensions?.parsing?.metrics?.fullAstPercentage || 0}%</strong> with{' '}
                <strong className="font-mono">{health.dimensions?.dependencies?.metrics?.unresolvedImports || 0}</strong> unresolved local import(s). Uncertainty is exposed across all dimensions.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <span className="px-2 py-1 rounded bg-surface border border-amber/40 text-[10px] font-mono text-amber-strong font-bold">
              UNCERTAINTY EXPOSED
            </span>
          </div>
        </div>
      )}

      {/* 3. Confidence Lens Summary Strip (When CONFIDENCE mode is toggled) */}
      {lensMode === 'confidence' && (
        <div className="bg-surface border border-line rounded-card p-4 shadow-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-interactive" />
              <span className="text-xs font-bold text-ink uppercase font-mono tracking-wide">
                Confidence Lens &bull; Analysis Reliability Breakdown
              </span>
            </div>
            <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-panel border border-line text-ink">
              Overall: {confidence.overallConfidence}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-panel/50 p-2 rounded">
              <div className="text-[10px] font-mono text-ink-3 uppercase">Parse Reliability</div>
              <div className="font-bold text-ink mt-0.5">{confidence.parseReliability}</div>
            </div>
            <div className="bg-panel/50 p-2 rounded">
              <div className="text-[10px] font-mono text-ink-3 uppercase">Graph Resolution</div>
              <div className="font-bold text-ink mt-0.5">{confidence.graphResolutionConfidence}</div>
            </div>
            <div className="bg-panel/50 p-2 rounded">
              <div className="text-[10px] font-mono text-ink-3 uppercase">Risk Scoring</div>
              <div className="font-bold text-ink mt-0.5">{confidence.riskConfidence}</div>
            </div>
            <div className="bg-panel/50 p-2 rounded">
              <div className="text-[10px] font-mono text-ink-3 uppercase">Protection Evidence</div>
              <div className="font-bold text-amber-strong mt-0.5">{confidence.protectionEvidenceConfidence}</div>
            </div>
            <div className="bg-panel/50 p-2 rounded">
              <div className="text-[10px] font-mono text-ink-3 uppercase">Modernization Evidence</div>
              <div className="font-bold text-ink mt-0.5">{confidence.modernizationEvidenceConfidence}</div>
            </div>
          </div>

          {confidence.reasons && confidence.reasons.length > 0 && (
            <div className="text-[11px] text-ink-3 font-mono pt-1">
              Confidence Caveats: {confidence.reasons.join(' • ')}
            </div>
          )}
        </div>
      )}

      {/* 4. Section 1: Repository Health Hero */}
      <RepositoryHealthHero
        health={health}
        lensMode={lensMode}
        onNavigateTab={onNavigateTab}
      />

      {/* 5. Section 2: Architecture Health Map */}
      <ArchitectureHealthMap
        subsystems={subsystems}
        lensMode={lensMode}
        onNavigateTab={onNavigateTab}
      />

      {/* 6. Section 3: 5 Health Dimension Cards */}
      <HealthDimensionCards
        dimensions={health.dimensions}
        lensMode={lensMode}
        onNavigateTab={onNavigateTab}
      />

      {/* 7. Section 4: Pressure Zones */}
      <PressureZonesSection
        pressureZones={pressureZones}
        onNavigateTab={onNavigateTab}
      />

      {/* 8. Section 5: Subsystem Health Matrix */}
      <SubsystemHealthMatrix subsystems={subsystems} />

      {/* 9. Section 6: Intelligent Signals */}
      <IntelligentSignalsSection signals={signals} />

      {/* 10. Section 7: Recommended Next Actions */}
      <NextActionsSection
        actions={nextActions}
        onNavigateTab={onNavigateTab}
        onSelectFile={onSelectFile}
      />
    </div>
  );
};

export default SystemPulseTab;
