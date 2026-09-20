import React, { useEffect, useState, useCallback } from 'react';
import {
  Target,
  Network,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Loader2,
  HelpCircle,
  FileCode2,
  TestTube,
  Wand2,
  Map,
  Compass,
} from 'lucide-react';
import { ChangeImpact, TabType } from '../../types';
import { truncateMiddle, getRiskLevelStyle } from '../../utils/formatters';
import Button from './Button';

export interface ChangeImpactViewProps {
  projectId?: string | null;
  targetFile?: string | null;
  impact?: ChangeImpact | null;
  isLoading?: boolean;
  onSelectFile?: (filePath: string) => void;
  onFocusInGraph?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onPrimaryAction?: () => void;
  showHeroAction?: boolean;
  className?: string;
}

export const ChangeImpactView: React.FC<ChangeImpactViewProps> = ({
  projectId,
  targetFile,
  impact: initialImpact = null,
  isLoading: externalLoading = false,
  onSelectFile,
  onFocusInGraph,
  onNavigateTab,
  onPrimaryAction,
  showHeroAction = true,
  className = '',
}) => {
  const [impact, setImpact] = useState<ChangeImpact | null>(initialImpact);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [activeDependentView, setActiveDependentView] = useState<'transitive' | 'direct'>('transitive');

  // Fetch impact from backend API if not provided or if targetFile changed
  const fetchImpact = useCallback(async (file: string) => {
    if (!projectId) return;
    setInternalLoading(true);
    setError(null);
    setIsUnavailable(false);

    try {
      const res = await fetch(`/api/projects/${projectId}/impact?target=${encodeURIComponent(file)}`);
      if (res.status === 404) {
        setIsUnavailable(true);
        setImpact(null);
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to calculate change impact (${res.status})`);
      }
      const data: ChangeImpact = await res.json();
      setImpact(data);
    } catch (err: any) {
      setError(err.message || 'Unable to compute change impact.');
      setImpact(null);
    } finally {
      setInternalLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // If initialImpact is provided and matches targetFile, use it directly
    if (initialImpact) {
      if (!targetFile || initialImpact.relative_path.replace(/\\/g, '/').toLowerCase().endsWith(targetFile.replace(/\\/g, '/').toLowerCase())) {
        setImpact(initialImpact);
        setError(null);
        setIsUnavailable(false);
        return;
      }
    }

    if (targetFile) {
      fetchImpact(targetFile);
    } else if (!initialImpact) {
      setImpact(null);
      setError(null);
      setIsUnavailable(false);
    }
  }, [targetFile, initialImpact, fetchImpact]);

  const loading = externalLoading || internalLoading;

  // 1. Loading State
  if (loading) {
    return (
      <div className={`bg-surface border border-line rounded-xl p-8 shadow-1 space-y-5 ${className}`}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo animate-spin" />
          <div>
            <div className="text-sm font-bold text-ink">Analyzing Change Impact &amp; Blast Radius…</div>
            <div className="text-xs text-ink-3">Tracing direct callers, downstream ripple, and affected entry points</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
        <div className="skeleton h-32 w-full rounded-lg" />
      </div>
    );
  }

  // 2. Empty State (no target file selected)
  if (!targetFile && !impact) {
    return (
      <div className={`bg-surface border border-dashed border-line rounded-xl p-10 text-center shadow-xs ${className}`}>
        <div className="w-12 h-12 rounded-full bg-tile border border-line flex items-center justify-center mx-auto mb-3 text-ink-3">
          <Target className="w-6 h-6" strokeWidth={1.5} />
        </div>
        <h4 className="font-display font-bold text-sm sm:text-base text-ink mb-1">
          No File Selected for Change Impact
        </h4>
        <p className="text-xs text-ink-3 max-w-md mx-auto mb-4">
          Select any source module from the list or dependency map to calculate downstream ripple, direct callers, affected entry points, and required protection tests.
        </p>
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab?.('hotspots')}
            icon={<Compass className="w-3.5 h-3.5" />}
          >
            Explore Risk Hotspots
          </Button>
        </div>
      </div>
    );
  }

  // 3. Unavailable State (e.g. external package, unparsed file, or outside AST)
  if (isUnavailable) {
    return (
      <div className={`bg-surface border border-line rounded-xl p-8 text-center shadow-xs space-y-3 ${className}`}>
        <div className="w-10 h-10 rounded-full bg-amber-surface border border-amber/20 flex items-center justify-center mx-auto text-amber-strong">
          <HelpCircle className="w-5 h-5" />
        </div>
        <h4 className="font-display font-bold text-sm text-ink">
          Change Impact Unavailable
        </h4>
        <p className="text-xs text-ink-3 max-w-md mx-auto">
          Static AST blast-radius assessment is unavailable for <code className="font-mono text-ink font-semibold">{targetFile}</code>. This file may be an external dependency, excluded from ingestion, or unsupported.
        </p>
        {targetFile && (
          <div className="pt-2 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchImpact(targetFile)}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Retry Inspection
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 4. Error State
  if (error || !impact) {
    return (
      <div className={`bg-red-surface border border-red-line rounded-xl p-8 text-center shadow-xs space-y-3 ${className}`}>
        <div className="w-10 h-10 rounded-full bg-red-strong/10 text-red-strong flex items-center justify-center mx-auto">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h4 className="font-bold text-sm text-red-text">
          Change Impact Calculation Error
        </h4>
        <p className="text-xs text-red-text/80 max-w-md mx-auto">
          {error || 'Unable to calculate change impact for this module.'}
        </p>
        {targetFile && (
          <div className="pt-2 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchImpact(targetFile)}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 5. Full Loaded View with all 10 dimensions
  const riskStyle = getRiskLevelStyle(impact.risk_level);
  const directCount = impact.direct_dependents?.length || 0;
  const transitiveCount = impact.transitive_dependents?.length || impact.blast_radius || 0;
  const depth = impact.dependency_depth || 0;
  const directDepsCount = impact.direct_dependencies?.length || 0;
  const entryCount = impact.affected_entry_points?.length || 0;
  const testCount = impact.suggested_tests?.length || 0;
  const hasCycles = impact.is_cycle_participant || (impact.cycles && impact.cycles.length > 0);

  return (
    <div className={`bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-5 animate-[fade-up_150ms_ease-out_both] ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-mono font-bold text-sm sm:text-base text-ink break-all">
              {impact.relative_path}
            </h3>
            <span className={`text-[11px] px-2 py-0.5 rounded-pill uppercase tracking-wider ${riskStyle.badgeClass}`}>
              {riskStyle.label}
            </span>
            {impact.wave_title && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-pill bg-indigo-surface text-indigo font-bold font-mono border border-indigo/20">
                WAVE {impact.wave || 1}
              </span>
            )}
            {hasCycles ? (
              <span className="text-[11px] px-2 py-0.5 rounded-pill bg-red-surface text-red-strong font-bold font-sans border border-red-line flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> CYCLE PARTICIPANT
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-pill bg-teal-surface text-teal-strong font-bold font-sans border border-teal/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> LINEAR (NO CYCLES)
              </span>
            )}
          </div>
          <p className="text-xs text-ink-3 mt-1">
            Static AST blast-radius assessment &bull; Maximum propagation depth: <strong className="text-ink">{depth} {depth === 1 ? 'hop' : 'hops'}</strong>
          </p>
        </div>

        {/* Primary Action Button */}
        {showHeroAction && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="indigo"
              size="sm"
              onClick={() => {
                if (onPrimaryAction) {
                  onPrimaryAction();
                } else {
                  onFocusInGraph?.(impact.relative_path);
                  onNavigateTab?.('graph');
                }
              }}
              icon={<Target className="w-3.5 h-3.5" />}
              className="shadow-xs font-bold"
            >
              What breaks if I change this?
            </Button>
          </div>
        )}
      </div>

      {/* 4 Quick Impact KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-tile border border-line rounded-lg">
          <div className="text-[10px] uppercase font-bold text-ink-3">Blast Radius</div>
          <div className="text-lg font-bold font-mono text-ink mt-0.5">
            {transitiveCount} <span className="text-xs font-normal text-ink-3">{transitiveCount === 1 ? 'file' : 'files'}</span>
          </div>
          <div className="text-[10px] text-ink-3 mt-0.5">
            {directCount} direct / {transitiveCount} transitive
          </div>
        </div>

        <div className="p-3 bg-tile border border-line rounded-lg">
          <div className="text-[10px] uppercase font-bold text-ink-3">Propagation Depth</div>
          <div className="text-lg font-bold font-mono text-ink mt-0.5">
            {depth} <span className="text-xs font-normal text-ink-3">{depth === 1 ? 'hop' : 'hops'}</span>
          </div>
          <div className="text-[10px] text-ink-3 mt-0.5">
            Max downstream chain
          </div>
        </div>

        <div className="p-3 bg-tile border border-line rounded-lg">
          <div className="text-[10px] uppercase font-bold text-ink-3">Entry Points Affected</div>
          <div className="text-lg font-bold font-mono text-ink mt-0.5">
            {entryCount}
          </div>
          <div className="text-[10px] text-ink-3 mt-0.5">
            Root execution targets
          </div>
        </div>

        <div className="p-3 bg-tile border border-line rounded-lg">
          <div className="text-[10px] uppercase font-bold text-ink-3">Protection Tests</div>
          <div className="text-lg font-bold font-mono text-ink mt-0.5">
            {testCount}
          </div>
          <div className="text-[10px] text-ink-3 mt-0.5">
            Characterization suites
          </div>
        </div>
      </div>

      {/* Recommended Action Callout Banner */}
      {impact.recommended_action && (
        <div className="p-3.5 bg-indigo-surface border border-indigo/25 rounded-lg flex items-start gap-2.5 text-xs text-indigo-text">
          <ShieldCheck className="w-4 h-4 text-indigo mt-0.5 shrink-0" />
          <div>
            <strong className="font-bold text-ink block mb-0.5">Recommended Remediation Action:</strong>
            <span>{impact.recommended_action}</span>
          </div>
        </div>
      )}

      {/* Risk Reasons & Structured Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Reasons */}
        <div className="bg-tile border border-line rounded-lg p-4 space-y-2">
          <span className="text-[11px] font-bold text-ink uppercase tracking-wider block">
            Risk Reasons &amp; Blast Triggers:
          </span>
          {impact.reasons && impact.reasons.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-ink-2">
              {impact.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-strong font-bold mt-0.5">&bull;</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-3 italic">No elevated risk indicators detected.</p>
          )}
        </div>

        {/* Structured Evidence */}
        <div className="bg-tile border border-line rounded-lg p-4 space-y-2">
          <span className="text-[11px] font-bold text-ink uppercase tracking-wider block">
            Static Evidence &amp; Coupling Factors:
          </span>
          {impact.risk_evidence && impact.risk_evidence.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {impact.risk_evidence.map((ev, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-surface border border-line text-[11px] font-mono text-ink-2 shadow-xs"
                >
                  {ev}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-3 italic">Standard coupling metrics.</p>
          )}
        </div>
      </div>

      {/* Dependency Cycles Indicator */}
      {hasCycles && (
        <div className="p-3.5 bg-red-surface border border-red-line rounded-lg text-xs space-y-2">
          <div className="flex items-center gap-2 text-red-strong font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Circular Dependency Warning: Cycle Participant</span>
          </div>
          <p className="text-red-text leading-relaxed">
            This file is involved in circular runtime or import loop(s). Cyclic coupling magnifies blast radius and prevents isolated modernization. Untangle cycle boundaries before refactoring.
          </p>
          {impact.cycles && impact.cycles.length > 0 && (
            <div className="space-y-1 pt-1">
              {impact.cycles.map((cycle, cIdx) => (
                <div key={cIdx} className="font-mono text-[11px] text-red-text bg-surface/80 p-2 rounded border border-red-line/60">
                  {cycle.join(' → ')} → {cycle[0]}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Downstream Blast Radius vs Upstream Dependencies Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Downstream Dependents (What breaks if I change this?) */}
        <div className="bg-tile border border-line rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Network className="w-4 h-4 text-red-strong" />
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Downstream Ripple ({transitiveCount})
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveDependentView('transitive')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  activeDependentView === 'transitive'
                    ? 'bg-ink text-white'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                Transitive ({transitiveCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveDependentView('direct')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  activeDependentView === 'direct'
                    ? 'bg-ink text-white'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                Direct ({directCount})
              </button>
            </div>
          </div>

          <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 font-mono text-xs">
            {(activeDependentView === 'transitive' ? impact.transitive_dependents : impact.direct_dependents)?.length ? (
              (activeDependentView === 'transitive' ? impact.transitive_dependents : impact.direct_dependents).map((dep, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 bg-surface border border-line rounded text-ink hover:border-indigo/40 transition-colors"
                >
                  <span className="truncate" title={dep}>
                    {truncateMiddle(dep, 28)}
                  </span>
                  {onSelectFile && (
                    <button
                      type="button"
                      onClick={() => onSelectFile(dep)}
                      className="text-[10px] font-sans font-bold text-indigo hover:underline shrink-0 ml-2"
                    >
                      Inspect →
                    </button>
                  )}
                </div>
              ))
            ) : (
              <span className="text-ink-3 font-sans italic text-xs block py-2">
                No downstream dependents found (isolated leaf module).
              </span>
            )}
          </div>
        </div>

        {/* 2. Direct Dependencies (Upstream Imports) */}
        <div className="bg-tile border border-line rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4 text-indigo" />
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Direct Dependencies ({directDepsCount})
              </span>
            </div>
            <span className="text-[11px] text-ink-3">Imported by this file</span>
          </div>

          <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 font-mono text-xs">
            {impact.direct_dependencies && impact.direct_dependencies.length > 0 ? (
              impact.direct_dependencies.map((dep, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 bg-surface border border-line rounded text-ink hover:border-indigo/40 transition-colors"
                >
                  <span className="truncate" title={dep}>
                    {truncateMiddle(dep, 28)}
                  </span>
                  {onSelectFile && (
                    <button
                      type="button"
                      onClick={() => onSelectFile(dep)}
                      className="text-[10px] font-sans font-bold text-indigo hover:underline shrink-0 ml-2"
                    >
                      Inspect →
                    </button>
                  )}
                </div>
              ))
            ) : (
              <span className="text-ink-3 font-sans italic text-xs block py-2">
                No local dependencies (independent module).
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Affected Entry Points & Related Protection Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Affected Entry Points */}
        <div className="bg-tile border border-line rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-amber-strong" />
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Affected Entry Points ({entryCount})
            </span>
          </div>
          <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1 font-mono text-xs text-ink-2">
            {impact.affected_entry_points && impact.affected_entry_points.length > 0 ? (
              impact.affected_entry_points.map((ep, idx) => (
                <div key={idx} className="truncate p-1 bg-surface border border-line/70 rounded" title={ep}>
                  {ep}
                </div>
              ))
            ) : (
              <span className="text-ink-3 font-sans italic text-xs">None directly affected.</span>
            )}
          </div>
        </div>

        {/* Suggested Characterization Tests */}
        <div className="bg-tile border border-line rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube className="w-4 h-4 text-teal-strong" />
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Related Tests ({testCount})
              </span>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('tests')}
                className="text-[11px] font-semibold text-teal-strong hover:underline"
              >
                Open Safety Tests &rarr;
              </button>
            )}
          </div>
          <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1 font-mono text-xs text-ink-2">
            {impact.suggested_tests && impact.suggested_tests.length > 0 ? (
              impact.suggested_tests.map((testPath, idx) => (
                <div key={idx} className="truncate p-1 bg-surface border border-line/70 rounded" title={testPath}>
                  {testPath}
                </div>
              ))
            ) : (
              <span className="text-ink-3 font-sans italic text-xs">No characterization tests recorded.</span>
            )}
          </div>
        </div>
      </div>

      {/* Connected Workspace Actions Across All Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line">
        <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wider mr-1">
          Jump to Tab:
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onFocusInGraph?.(impact.relative_path);
            onNavigateTab?.('graph');
          }}
          icon={<Network className="w-3.5 h-3.5" />}
        >
          Inspect in Dependency Map
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onSelectFile?.(impact.relative_path);
            onNavigateTab?.('tests');
          }}
          icon={<TestTube className="w-3.5 h-3.5" />}
        >
          Generate Tests
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onSelectFile?.(impact.relative_path);
            onNavigateTab?.('refactor');
          }}
          icon={<Wand2 className="w-3.5 h-3.5" />}
        >
          Review Modernization
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onSelectFile?.(impact.relative_path);
            onNavigateTab?.('migration');
          }}
          icon={<Map className="w-3.5 h-3.5" />}
        >
          Open Impact &amp; Plan
        </Button>
      </div>
    </div>
  );
};

export default ChangeImpactView;
