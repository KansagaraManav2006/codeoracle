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
    <div className="w-full max-w-[1240px] mx-auto space-y-6 pb-14 animate-[fade-up_250ms_ease-out_both]">
      {/* 1. Page Header Hero Card */}
      <section
        className="bg-white border border-[#D7EAF5] rounded-[20px] p-5 sm:p-6 shadow-[0_8px_28px_rgba(11,61,145,0.06)] transition-all"
        aria-label="System Pulse Header"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0B3D91] to-[#3BA7F2] flex items-center justify-center text-white shadow-sm shrink-0"
              aria-hidden="true"
            >
              <Activity className="w-5 h-5" strokeWidth={2.2} />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#102536] tracking-tight font-display">
                  SYSTEM PULSE
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F6FF] text-[#0B3D91] border border-[#3BA7F2]/30">
                  Repository Health Observatory
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#52697A] font-sans mt-1 leading-relaxed max-w-2xl">
                Executive repository health, architectural pressure, confidence, and next-action intelligence.
              </p>
            </div>
          </div>

          {/* Lens Mode Toggle (HEALTH vs CONFIDENCE) */}
          <div className="flex items-center p-1 bg-[#F0F7FD] rounded-full border border-[#D7EAF5] shrink-0 self-start md:self-center shadow-inner">
            <button
              type="button"
              onClick={() => setLensMode('health')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all ${
                lensMode === 'health'
                  ? 'bg-[#0B3D91] text-white shadow-sm'
                  : 'text-[#52697A] hover:text-[#102536]'
              }`}
              aria-pressed={lensMode === 'health'}
            >
              HEALTH
            </button>
            <button
              type="button"
              onClick={() => setLensMode('confidence')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all ${
                lensMode === 'confidence'
                  ? 'bg-[#0B3D91] text-white shadow-sm'
                  : 'text-[#52697A] hover:text-[#102536]'
              }`}
              aria-pressed={lensMode === 'confidence'}
            >
              CONFIDENCE
            </button>
          </div>
        </div>

        {/* Secondary Metadata Line */}
        <div className="border-t border-[#D7EAF5] pt-3.5 mt-4 flex items-center gap-2.5 flex-wrap text-xs text-[#52697A]">
          <span className="text-[11px] font-semibold text-[#52697A] uppercase tracking-wider">Repository:</span>
          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-[#F7FBFF] border border-[#D7EAF5] text-[#102536]">
            {projectName}
          </span>

          <span className="text-[#D7EAF5] select-none" aria-hidden="true">•</span>

          <span className="text-[11px] font-semibold text-[#52697A] uppercase tracking-wider">Analysis Confidence:</span>
          <span
            className={`font-mono text-xs font-bold px-2 py-0.5 rounded uppercase ${
              confidence.overallConfidence.toLowerCase() === 'high'
                ? 'bg-[#E6F8F3] text-[#167C69] border border-[#7FE7D6]/50'
                : confidence.overallConfidence.toLowerCase() === 'medium'
                ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]'
                : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
            }`}
          >
            {confidence.overallConfidence}
          </span>

          <span className="text-[#D7EAF5] select-none" aria-hidden="true">•</span>

          <span className="text-[11px] font-semibold text-[#52697A] uppercase tracking-wider">Mode:</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#F7FBFF] border border-[#D7EAF5] text-[#102536]">
            Deterministic Static AST & Topology
          </span>

          {targetFile && (
            <>
              <span className="text-[#D7EAF5] select-none" aria-hidden="true">•</span>
              <span
                className="font-mono text-xs px-2.5 py-0.5 rounded bg-[#E8F6FF] border border-[#3BA7F2]/30 text-[#0B3D91] font-medium truncate max-w-[280px]"
                title={targetFile}
              >
                Target: {targetFile}
              </span>
            </>
          )}
        </div>
      </section>

      {/* 2. Soft Contextual Alert for Partial Analysis */}
      {health.isPartial && (
        <section
          className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[18px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(217,119,6,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
          aria-label="Partial Analysis Notice"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center text-[#B45309] shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-[#92400E]">
                  Analysis Confidence: Partial
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FCD34D] text-[10px] font-bold font-mono text-[#92400E] uppercase">
                  Uncertainty Exposed
                </span>
              </div>
              <p className="mt-1 text-xs text-[#78350F] leading-relaxed">
                <span className="font-mono font-bold">{health.dimensions?.parsing?.metrics?.fullAstPercentage || 0}%</span> full AST coverage &bull;{' '}
                <span className="font-mono font-bold">{health.dimensions?.dependencies?.metrics?.unresolvedImports || 0}</span> unresolved imports &bull;{' '}
                Some system-level conclusions have reduced confidence.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => onNavigateTab('overview')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-[#92400E] hover:bg-[#FEF3C7] border border-[#FCD34D] shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>Inspect Analysis Gaps</span>
            </button>
          </div>
        </section>
      )}

      {/* 3. Confidence Lens Summary Strip (When CONFIDENCE mode is toggled) */}
      {lensMode === 'confidence' && (
        <section className="bg-white border border-[#D7EAF5] rounded-[20px] p-5 shadow-[0_8px_28px_rgba(11,61,145,0.06)] space-y-4 animate-[fade-up_200ms_ease-out_both]">
          <div className="flex items-center justify-between pb-3 border-b border-[#D7EAF5]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91]">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#102536]">
                  Confidence Lens &bull; Analysis Reliability Breakdown
                </h3>
                <p className="text-xs text-[#52697A]">
                  Direct indicator of AST completeness, unresolved references, and test coverage evidence
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-md bg-[#F7FBFF] border border-[#D7EAF5] text-[#0B3D91]">
              Overall: {confidence.overallConfidence}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-3 rounded-xl">
              <div className="text-[11px] font-medium text-[#52697A]">Parse Reliability</div>
              <div className="font-bold text-[#102536] text-sm mt-1">{confidence.parseReliability}</div>
            </div>
            <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-3 rounded-xl">
              <div className="text-[11px] font-medium text-[#52697A]">Graph Resolution</div>
              <div className="font-bold text-[#102536] text-sm mt-1">{confidence.graphResolutionConfidence}</div>
            </div>
            <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-3 rounded-xl">
              <div className="text-[11px] font-medium text-[#52697A]">Risk Scoring</div>
              <div className="font-bold text-[#102536] text-sm mt-1">{confidence.riskConfidence}</div>
            </div>
            <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-3 rounded-xl">
              <div className="text-[11px] font-medium text-[#52697A]">Protection Evidence</div>
              <div className="font-bold text-[#B45309] text-sm mt-1">{confidence.protectionEvidenceConfidence}</div>
            </div>
            <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-3 rounded-xl">
              <div className="text-[11px] font-medium text-[#52697A]">Modernization Evidence</div>
              <div className="font-bold text-[#102536] text-sm mt-1">{confidence.modernizationEvidenceConfidence}</div>
            </div>
          </div>

          {confidence.reasons && confidence.reasons.length > 0 && (
            <div className="text-xs text-[#52697A] pt-1">
              <strong className="text-[#102536] font-semibold">Confidence Caveats: </strong>
              {confidence.reasons.join(' • ')}
            </div>
          )}
        </section>
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
