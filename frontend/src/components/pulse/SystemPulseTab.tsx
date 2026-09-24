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
import PageHeroHeader from '../common/PageHeroHeader';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

interface SystemPulseTabProps {
  projectId: string;
  projectName: string;
  targetFile?: string | null;
  onNavigateTab: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
}

export const SystemPulseTab: React.FC<SystemPulseTabProps> = ({
  projectId,
  projectName: _projectName,
  targetFile: _targetFile,
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
      <Card variant="primary" padding="lg" className="flex flex-col items-center justify-center min-h-[380px] text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-surface border border-indigo/20 flex items-center justify-center text-indigo mb-3 animate-pulse">
          <Activity className="w-6 h-6" strokeWidth={2} />
        </div>
        <h3 className="text-base font-bold text-ink tracking-tight font-display">
          Synthesizing System Pulse
        </h3>
        <p className="text-xs text-ink-3 max-w-md mt-1 leading-relaxed">
          Evaluating AST parsing fidelity, dependency graph topology, test harness protection, and modernization debt...
        </p>
      </Card>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <Card variant="primary" padding="lg" className="flex flex-col items-center justify-center min-h-[360px] text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-surface border border-amber/30 flex items-center justify-center text-amber-strong mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-ink font-display">Unable to Load Observatory</h3>
        <p className="text-xs text-ink-3 max-w-md mt-1 mb-4 leading-relaxed">
          {error || 'System Pulse metrics could not be generated for this project.'}
        </p>
        <Button
          variant="indigo"
          size="sm"
          onClick={fetchSystemPulse}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Retry Generation
        </Button>
      </Card>
    );
  }

  const { health, subsystems, pressureZones, signals, nextActions, confidence } = data;
  const isHighConf = confidence.overallConfidence.toLowerCase() === 'high';
  const isMediumConf = confidence.overallConfidence.toLowerCase() === 'medium';

  return (
    <div
      className="space-y-5 animate-[fade-up_250ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-pulse"
      aria-labelledby="tab-pulse"
    >
      {/* 1. Shared Apple-Modern Page Header Card */}
      <PageHeroHeader
        icon={Activity}
        title="SYSTEM PULSE"
        eyebrow="Observatory"
        confidence={confidence.overallConfidence}
        description="Executive repository health, architectural pressure, confidence, and next-action intelligence."
        actions={
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Health vs Confidence Lens Toggle */}
            <div
              className="inline-flex items-center p-1 rounded-xl bg-white/[0.08] border border-white/10 backdrop-blur-sm"
              role="group"
              aria-label="View lens mode"
            >
              <button
                type="button"
                onClick={() => setLensMode('health')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  lensMode === 'health'
                    ? 'bg-[#007AFF] text-white shadow-[0_2px_8px_rgba(0,122,255,0.4)]'
                    : 'text-white/65 hover:text-white/90 hover:bg-white/[0.04]'
                }`}
                aria-pressed={lensMode === 'health'}
              >
                Health View
              </button>
              <button
                type="button"
                onClick={() => setLensMode('confidence')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  lensMode === 'confidence'
                    ? 'bg-[#007AFF] text-white shadow-[0_2px_8px_rgba(0,122,255,0.4)]'
                    : 'text-white/65 hover:text-white/90 hover:bg-white/[0.04]'
                }`}
                aria-pressed={lensMode === 'confidence'}
              >
                Confidence Lens
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchSystemPulse}
              disabled={loading}
              title="Refresh System Pulse"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] border border-white/10 transition-all duration-200 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-white/90 transition-transform ${loading ? 'animate-spin' : ''}`}
                strokeWidth={2}
              />
              <span>Refresh</span>
            </button>
          </div>
        }
      />


      {/* 2. Soft Contextual Notice for Partial Analysis */}
      {health.isPartial && (
        <Card variant="secondary" padding="sm" className="bg-amber-surface/50 border-amber/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-surface border border-amber/30 flex items-center justify-center text-amber-strong shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-amber-strong font-sans uppercase tracking-wider">
                  Analysis Confidence: Partial
                </h4>
                <Badge tone="amber" size="sm">
                  Uncertainty Exposed
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-ink-2 leading-relaxed">
                <strong className="font-mono">{health.dimensions?.parsing?.metrics?.fullAstPercentage || 0}%</strong> full AST coverage &bull;{' '}
                <strong className="font-mono">{health.dimensions?.dependencies?.metrics?.unresolvedImports || 0}</strong> unresolved imports &bull;{' '}
                Some system-level conclusions have reduced confidence.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('overview')}
              className="bg-surface text-ink text-xs border-amber/40 hover:bg-amber-surface/70"
            >
              Inspect Analysis Gaps
            </Button>
          </div>
        </Card>
      )}

      {/* 3. Confidence Lens Summary Strip (When CONFIDENCE mode is toggled) */}
      {lensMode === 'confidence' && (
        <Card variant="secondary" padding="md" className="space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-line flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-surface border border-indigo/20 flex items-center justify-center text-indigo">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink font-display">
                  Confidence Lens &bull; Analysis Reliability Breakdown
                </h3>
                <p className="text-xs text-ink-3">
                  Direct indicator of AST completeness, unresolved references, and test coverage evidence
                </p>
              </div>
            </div>
            <Badge
              tone={isHighConf ? 'green' : isMediumConf ? 'amber' : 'red'}
              size="sm"
            >
              Overall: {confidence.overallConfidence}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-tile border border-line">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-3">AST Grammar Confidence</div>
              <div className="text-sm font-bold font-mono text-ink mt-0.5">
                {confidence.parseReliability || 'HIGH'}
              </div>
              <p className="text-[11px] text-ink-3 mt-1">Grounding: 100% deterministic syntax trees</p>
            </div>
            <div className="p-3 rounded-lg bg-tile border border-line">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-3">Graph Edge Reliability</div>
              <div className="text-sm font-bold font-mono text-ink mt-0.5">
                {confidence.graphResolutionConfidence || 'HIGH'}
              </div>
              <p className="text-[11px] text-ink-3 mt-1">Topology: Resolved caller-callee bindings</p>
            </div>
            <div className="p-3 rounded-lg bg-tile border border-line">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-3">Protection Evidence</div>
              <div className="text-sm font-bold font-mono text-ink mt-0.5">
                {confidence.protectionEvidenceConfidence || 'HIGH'}
              </div>
              <p className="text-[11px] text-ink-3 mt-1">Harness: Characterization test coverage</p>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Central Repository Health Hero (Structured Gauge + Dimensions) */}
      <RepositoryHealthHero
        health={health}
        lensMode={lensMode}
        onNavigateTab={onNavigateTab}
      />

      {/* 5. Architecture Health Map (Structured Topological Cards) */}
      <ArchitectureHealthMap
        subsystems={subsystems}
        lensMode={lensMode}
        onNavigateTab={onNavigateTab}
      />

      {/* 6. Health Dimension Observatory (5 Core Dimensions) */}
      <HealthDimensionCards
        dimensions={health.dimensions}
        lensMode={lensMode}
        onNavigateTab={onNavigateTab}
      />

      {/* 7. Pressure Zones Section */}
      <PressureZonesSection
        pressureZones={pressureZones}
        onNavigateTab={onNavigateTab}
      />

      {/* 8. Subsystem Health Matrix */}
      <SubsystemHealthMatrix subsystems={subsystems} />

      {/* 9. Intelligent Signals */}
      <IntelligentSignalsSection
        signals={signals}
        onNavigateTab={onNavigateTab}
      />

      {/* 10. Recommended Next Actions */}
      <NextActionsSection
        actions={nextActions}
        onNavigateTab={onNavigateTab}
        onSelectFile={onSelectFile}
      />
    </div>
  );
};

export default SystemPulseTab;
