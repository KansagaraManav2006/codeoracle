import React from 'react';
import { Target, Wand2, ShieldCheck, Lock, Sparkles, Flame } from 'lucide-react';
import {
  GeneratedTestFile,
  ChangeImpact,
  HotspotItem,
  TabType,
} from '../../types';
import Button from '../common/Button';
import { StatusTag } from '../common/Tags';
import CodeViewer from '../common/CodeViewer';

interface SelectedTestPanelProps {
  activeFile?: GeneratedTestFile;
  relatedHotspot: HotspotItem | null;
  activeImpact: ChangeImpact | null;
  relatedRefactor: any;
  onInspectImpact?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
}

export const SelectedTestPanel: React.FC<SelectedTestPanelProps> = ({
  activeFile,
  relatedHotspot,
  activeImpact,
  relatedRefactor,
  onInspectImpact,
  onNavigateTab,
  onSelectFile,
}) => {
  return (
    <div className="space-y-4 min-w-0 w-full max-w-full">
      {activeFile ? (
        <>
          {/* 1. Selected Test Header Bar */}
          <div className="bg-surface border border-line rounded-lg p-4 sm:p-5 shadow-1 space-y-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-line">
              <div className="min-w-0 flex-1">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  SELECTED CHARACTERIZATION TEST
                </span>
                <div
                  className="font-mono text-base sm:text-lg font-bold text-ink truncate mt-0.5"
                  title={activeFile.display_name || activeFile.safe_test_path}
                >
                  {activeFile.display_name || activeFile.safe_test_path}
                </div>
                <div className="text-xs text-ink-3 font-mono mt-0.5 truncate">
                  Protects: <strong className="text-ink font-semibold">{activeFile.target_relative_path}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {onInspectImpact && (
                  <Button
                    variant="indigo"
                    size="sm"
                    onClick={() => {
                      onSelectFile?.(activeFile.target_relative_path);
                      onInspectImpact(activeFile.target_relative_path);
                    }}
                    icon={<Target className="w-3.5 h-3.5" strokeWidth={2} />}
                    className="font-bold text-xs shadow-xs"
                  >
                    Check Blast Radius
                  </Button>
                )}

                {onNavigateTab && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSelectFile?.(activeFile.target_relative_path);
                      onNavigateTab('refactor');
                    }}
                    icon={<Wand2 className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Modernization Diff
                  </Button>
                )}
              </div>
            </div>

            {/* Badges & Semantics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-tile rounded p-2.5 border border-line/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  PROTECTION LEVEL
                </span>
                <div className="font-bold text-indigo mt-0.5 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo shrink-0" />
                  <span>
                    {activeFile.strength_level || 'L3'} · {(activeFile.test_strength || 'contract').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="bg-tile rounded p-2.5 border border-line/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  FRAMEWORK &amp; TYPE
                </span>
                <div className="font-semibold text-ink mt-0.5 capitalize truncate">
                  {activeFile.framework} ({activeFile.framework_archetype || 'generic'})
                </div>
              </div>

              <div className="bg-tile rounded p-2.5 border border-line/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  PROTECTION CONFIDENCE
                </span>
                <div className="font-bold mt-0.5 flex items-center gap-1 capitalize">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeFile.confidence === 'high'
                        ? 'bg-teal-strong'
                        : activeFile.confidence === 'low'
                        ? 'bg-red-strong'
                        : 'bg-amber-strong'
                    }`}
                  />
                  <span
                    className={
                      activeFile.confidence === 'high'
                        ? 'text-teal-strong'
                        : activeFile.confidence === 'low'
                        ? 'text-red-strong'
                        : 'text-amber-text'
                    }
                  >
                    {activeFile.confidence || 'Medium'} Confidence
                  </span>
                </div>
              </div>

              <div className="bg-tile rounded p-2.5 border border-line/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  RUNTIME STATE
                </span>
                <div className="font-bold mt-0.5 text-amber-text flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-strong shrink-0" />
                  <span>Safety Locked</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. "Why This Test?" Panel & Assertions Checklist */}
          <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo" />
                WHY WAS THIS TEST GENERATED?
              </span>
              <span className="text-[10px] text-ink-3 font-mono">
                {activeFile.test_count} assertion {activeFile.test_count === 1 ? 'contract' : 'contracts'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Left: Purpose and Findings */}
              <div className="space-y-2">
                <div>
                  <span className="font-bold text-[10px] uppercase text-ink-3 block">Analysis Finding:</span>
                  <p className="text-ink-2 mt-0.5 leading-relaxed">
                    {activeFile.why_generated?.finding ||
                      'Module exports core functions and types participating in modernization scope.'}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-[10px] uppercase text-ink-3 block">Protection Goal:</span>
                  <p className="text-ink-2 mt-0.5 leading-relaxed">
                    {activeFile.why_generated?.protection_goal ||
                      'Lock current callable contracts and boundary error conditions prior to refactoring.'}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-[10px] uppercase text-ink-3 block">Detected Dependencies:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeFile.why_generated?.detected_dependencies?.length ? (
                      activeFile.why_generated.detected_dependencies.slice(0, 5).map((dep) => (
                        <span key={dep} className="px-1.5 py-0.2 rounded bg-tile border border-line font-mono text-[10px] text-ink">
                          {dep}
                        </span>
                      ))
                    ) : (
                      <span className="text-ink-3 italic text-[11px]">No external local dependencies declared</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Confidence Breakdown & Generated Assertions */}
              <div className="space-y-2 bg-tile/40 rounded p-3 border border-line/60">
                <span className="font-bold text-[10px] uppercase text-ink-3 block">
                  Confidence &amp; Assertion Breakdown:
                </span>
                <ul className="space-y-1 text-[11px]">
                  {(activeFile.confidence_reasons && activeFile.confidence_reasons.length > 0
                    ? activeFile.confidence_reasons
                    : [
                        '✓ Valid syntax verified via static AST parsing',
                        '✓ Exported callables detected and asserted',
                        '✓ Boundary and error paths tested against invalid types',
                        '⚠ Live runtime execution safety-locked on untrusted upload',
                      ]
                  ).map((reason, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-snug">
                      <span className={reason.startsWith('✓') ? 'text-teal-strong font-bold shrink-0' : 'text-amber-strong font-bold shrink-0'}>
                        {reason.startsWith('✓') ? '✓' : '⚠'}
                      </span>
                      <span className={reason.startsWith('✓') ? 'text-ink-2' : 'text-amber-text'}>
                        {reason.replace(/^[✓⚠]\s*/, '')}
                      </span>
                    </li>
                  ))}
                </ul>

                {activeFile.why_generated?.limitations && (
                  <p className="text-[10px] text-ink-4 pt-1.5 border-t border-line/40">
                    <strong>Limitation:</strong> {activeFile.why_generated.limitations}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 3. Cross-Tab Connections: Hotspot & Refactor status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Related Hotspot */}
            <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-strong" />
                  Related Hotspot Risk
                </span>
                {relatedHotspot ? (
                  <StatusTag
                    status={
                      (relatedHotspot.overallRisk || relatedHotspot.risk_level) === 'critical'
                        ? 'critical'
                        : (relatedHotspot.overallRisk || relatedHotspot.risk_level) === 'high'
                        ? 'complexity-high'
                        : 'complexity-medium'
                    }
                    label={`RISK: ${(relatedHotspot.overallRisk || relatedHotspot.risk_level || 'LOW').toUpperCase()} (${relatedHotspot.hotspotScore ?? relatedHotspot.hotspot_score ?? 0}/100)`}
                  />
                ) : (
                  <span className="text-[10px] text-teal-strong font-bold">Low / Clean</span>
                )}
              </div>
              <p className="text-[11px] text-ink-2">
                {relatedHotspot ? relatedHotspot.reason : 'No severe complexity or churn hotspots detected for this module.'}
              </p>
            </div>

            {/* Related Migration Impact */}
            <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo" />
                  Downstream Blast Radius
                </span>
                {activeImpact ? (
                  <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wider bg-tile border border-line text-ink-2">
                    {activeImpact.blast_radius} affected modules
                  </span>
                ) : (
                  <span className="text-[10px] text-ink-3">Calculating…</span>
                )}
              </div>
              <p className="text-[11px] text-ink-2">
                {activeImpact
                  ? `${activeImpact.direct_dependents?.length || 0} direct callers · ${activeImpact.transitive_dependents?.length || 0} transitive modules.`
                  : 'Evaluating dependency graph blast radius.'}
              </p>
            </div>
          </div>

          {/* Modernization Proposal Connection Card */}
          <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <Wand2 className="w-4 h-4 text-teal-strong shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-ink flex items-center gap-2">
                  <span>Modernization Proposal:</span>
                  <span
                    className={`font-semibold ${
                      relatedRefactor?.changed ? 'text-amber-text' : 'text-teal-strong'
                    }`}
                  >
                    {relatedRefactor?.changed
                      ? `Available (${relatedRefactor.changes.length} deterministic update${
                          relatedRefactor.changes.length === 1 ? '' : 's'
                        })`
                      : 'Clean / Up to Date'}
                  </span>
                </div>
                <p className="text-[11px] text-ink-3 mt-0.5 truncate">
                  {relatedRefactor?.changed
                    ? 'Deterministic modernized code ready for review. Characterization tests protect against regressions.'
                    : 'No legacy Python 2 / JS var patterns found in this source module.'}
                </p>
              </div>
            </div>

            {relatedRefactor?.changed && onNavigateTab && (
              <Button
                variant="indigo"
                size="sm"
                onClick={() => {
                  onSelectFile?.(activeFile.target_relative_path);
                  onNavigateTab('refactor');
                }}
                icon={<Wand2 className="w-3.5 h-3.5" />}
                className="text-xs font-bold shrink-0"
              >
                Preview Modernization Diff
              </Button>
            )}
          </div>

          {/* 4. Enhanced Code Viewer */}
          <CodeViewer
            filePath={activeFile.display_name || activeFile.safe_test_path}
            targetPath={activeFile.target_relative_path}
            code={activeFile.code}
            language={activeFile.language}
            syntaxStatus={activeFile.syntax_valid ? 'AST Syntax Valid' : 'Syntax Error'}
          />
        </>
      ) : (
        <div className="p-12 text-center text-ink-3 bg-surface border border-line rounded-lg">
          Select a test file from the explorer to review characterization code.
        </div>
      )}
    </div>
  );
};

export default SelectedTestPanel;
