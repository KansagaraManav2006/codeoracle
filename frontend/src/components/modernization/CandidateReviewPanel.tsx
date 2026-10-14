import React from 'react';
import {
  Target,
  TestTube,
  Code2,
  CheckCircle2,
  Check,
  AlertTriangle,
  AlertCircle,
  Flame,
  CheckSquare,
} from 'lucide-react';
import Button from '../common/Button';
import DiffViewer, { DiffMode, RuleWarning, DiffExplanation } from '../common/DiffViewer';
import {
  RefactoredFile,
  GeneratedTestFile,
  HotspotItem,
  ChangeImpact,
  TabType,
} from '../../types';
import { FileMetadata } from '../../utils/modernizationUtils';

interface CandidateReviewPanelProps {
  selectedFile?: RefactoredFile;
  selectedMeta?: FileMetadata;
  relatedTest?: GeneratedTestFile;
  relatedHotspot?: HotspotItem;
  relatedFindings: any[];
  activeImpact?: ChangeImpact | null;
  mode: DiffMode;
  onModeChange: (mode: DiffMode) => void;
  syntaxCheckPassed: boolean;
  syntaxStateText: string;
  ruleWarning?: RuleWarning | null;
  diffExplanation?: DiffExplanation | null;
  reviewChecklist: Record<
    string,
    {
      diffReviewed: boolean;
      testsReviewed: boolean;
      impactChecked: boolean;
      runtimeVerified: boolean;
      approved: boolean;
    }
  >;
  onToggleChecklistItem: (
    path: string,
    itemKey:
      | 'diffReviewed'
      | 'testsReviewed'
      | 'impactChecked'
      | 'runtimeVerified'
      | 'approved'
  ) => void;
  onInspectImpact?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
}

export const CandidateReviewPanel: React.FC<CandidateReviewPanelProps> = ({
  selectedFile,
  selectedMeta,
  relatedTest,
  relatedHotspot,
  relatedFindings,
  activeImpact,
  mode,
  onModeChange,
  syntaxCheckPassed,
  syntaxStateText,
  ruleWarning,
  diffExplanation,
  reviewChecklist,
  onToggleChecklistItem,
  onInspectImpact,
  onNavigateTab,
  onSelectFile,
}) => {
  if (!selectedFile || !selectedMeta) {
    return (
      <div className="bg-surface border border-line rounded-lg p-12 text-center text-xs text-ink-3 space-y-2">
        <p>Select a modernization candidate from the left panel to inspect diff and verification details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      {/* Selected Target Header */}
      <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div className="min-w-0">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
              TARGET SOURCE FILE
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-mono text-base font-bold text-ink truncate max-w-md">
                {selectedFile.relative_path}
              </span>
              {selectedFile.changed ? (
                <span className="px-2 py-0.5 rounded-pill bg-amber-surface text-amber-strong text-[11px] font-bold border border-amber/30">
                  DIFF GENERATED ({selectedFile.changes.length} transform
                  {selectedFile.changes.length === 1 ? '' : 's'})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-pill bg-tile text-ink-3 text-[11px] font-medium border border-line">
                  CLEAN / UNCHANGED (0 transforms)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onInspectImpact && (
              <Button
                variant="indigo"
                size="sm"
                onClick={() => {
                  onSelectFile?.(selectedFile.relative_path);
                  onInspectImpact(selectedFile.relative_path);
                }}
                icon={<Target className="w-3.5 h-3.5" />}
                className="font-bold text-xs shadow-xs"
              >
                What breaks if I change this?
              </Button>
            )}

            {onNavigateTab && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectFile?.(selectedFile.relative_path);
                  onNavigateTab('tests');
                }}
                icon={<TestTube className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Inspect Safety Tests
              </Button>
            )}
          </div>
        </div>

        {/* Candidate Classification & Modernization Confidence Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Candidate Classification & Safe Autofix vs Refactor */}
          <div className="bg-tile border border-line rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[10px] text-ink-3">
                Modernization Classification
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  selectedFile.changed
                    ? 'bg-teal-surface text-teal-strong border border-teal/20'
                    : 'bg-indigo-surface text-indigo-text border border-indigo/20'
                }`}
              >
                {selectedFile.changed ? 'SAFE AUTOFIX' : 'REFACTOR RECOMMENDATION'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-ink">
                {selectedMeta.candidateType}
              </div>
              <p className="text-[11px] text-ink-2 leading-relaxed">
                {selectedFile.changed
                  ? 'Deterministic rule pattern matched with guaranteed syntax preservation.'
                  : 'Structural, cyclic, or complex code requiring human engineering review and safety test verification before modifying.'}
              </p>
            </div>

            <div className="pt-1.5 border-t border-line/50 flex items-center justify-between text-[11px] text-ink-3">
              <span>Blast radius: {selectedMeta.blastRadius}</span>
              <span>Findings: {selectedMeta.findingsCount}</span>
            </div>
          </div>

          {/* Modernization Confidence Breakdown */}
          <div className="bg-tile border border-line rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[10px] text-ink-3">
                Modernization Confidence
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  selectedMeta.confidence === 'high'
                    ? 'bg-teal-surface text-teal-strong border-teal/30'
                    : selectedMeta.confidence === 'medium'
                    ? 'bg-indigo-surface text-indigo border-indigo/30'
                    : 'bg-amber-surface text-amber-strong border-amber/30'
                }`}
              >
                {selectedMeta.confidence.toUpperCase()} CONFIDENCE
              </span>
            </div>

            <div className="space-y-1 font-sans text-[11px]">
              {selectedMeta.confidenceChecks.map((chk, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {chk.passed ? (
                    <Check className="w-3.5 h-3.5 text-teal-strong shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-strong shrink-0" />
                  )}
                  <span className={chk.passed ? 'text-ink-2' : 'text-amber-text'}>
                    {chk.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clean File State vs Protection Requirements */}
      {!selectedFile.changed ? (
        <div className="bg-tile border border-line rounded-lg p-4 space-y-1 text-xs">
          <div className="flex items-center gap-2 font-bold text-ink">
            <CheckCircle2 className="w-4 h-4 text-teal-strong" />
            <span>NO CHANGE PROPOSED</span>
          </div>
          <p className="text-ink-3 leading-relaxed">
            No deterministic modernization transform applies to this file. Source code remains 100% untouched.
          </p>
          <p className="text-ink-4 text-[11px] pt-1">
            {relatedTest
              ? `Protected by safety test: ${relatedTest.safe_test_path}`
              : 'No generated protection test is associated with this file.'}
          </p>
        </div>
      ) : (
        /* Protection Missing warning ONLY when proposals exist AND tests are missing */
        !relatedTest && (
          <div className="p-3.5 bg-amber-surface/70 border border-amber-line rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-text">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-strong shrink-0 mt-0.5" />
              <div>
                <strong className="block text-ink font-bold">
                  PROTECTION MISSING: Safety Unit Tests Required
                </strong>
                <p className="text-[11px] opacity-90 mt-0.5">
                  This file has proposed modernizations but lacks characterization safety protection tests. Generate tests before merging to prevent regressions.
                </p>
              </div>
            </div>
            {onNavigateTab && (
              <Button
                variant="indigo"
                size="sm"
                onClick={() => {
                  onSelectFile?.(selectedFile.relative_path);
                  onNavigateTab('tests');
                }}
                icon={<TestTube className="w-3.5 h-3.5" />}
                className="shrink-0 text-xs font-bold"
              >
                Generate Safety Tests
              </Button>
            )}
          </div>
        )
      )}

      {/* Blocked By & Recommended Action (if candidate without diff) */}
      {!selectedFile.changed && selectedMeta.modFindingsCount > 0 && (
        <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-strong" />
              BLOCKED BY (Rejection reason)
            </span>
            <span className="text-[11px] text-ink-3 font-mono">
              {selectedMeta.disposition.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="p-3 bg-tile border border-line rounded-lg space-y-2">
            <p className="text-ink-2 leading-relaxed text-[11px]">
              {selectedMeta.disposition === 'missing_protection'
                ? 'Blocked by missing characterization test protection. CodeOracle does not auto-apply diffs without regression guards.'
                : selectedMeta.disposition === 'unsupported_transform'
                ? 'Blocked because no deterministic 100% AST-preserving transformation matches this construct.'
                : selectedMeta.disposition === 'high_blast_radius'
                ? `Blocked by high transitive dependency blast radius (${selectedMeta.blastRadius} dependents). Requires manual staging.`
                : 'Blocked for manual review: architectural or high-complexity patterns require developer oversight.'}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <strong className="text-ink">Recommended Next Action:</strong>
              {selectedMeta.disposition === 'missing_protection' && onNavigateTab ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSelectFile?.(selectedFile.relative_path);
                    onNavigateTab('tests');
                  }}
                  icon={<TestTube className="w-3.5 h-3.5" />}
                >
                  Generate Safety Test
                </Button>
              ) : onInspectImpact ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onInspectImpact(selectedFile.relative_path)}
                  icon={<Target className="w-3.5 h-3.5" />}
                >
                  Inspect Dependency Blast Radius
                </Button>
              ) : (
                <span className="font-mono text-indigo font-bold">
                  Review Manually Before Applying
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Impact & Blast Radius */}
      <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-indigo" />
            Change Impact &amp; Blast Radius
          </span>
          <span className="font-mono text-[11px] text-ink-3">
            Canonical Dependency Graph
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
          <div className="p-2.5 rounded bg-tile border border-line">
            <span className="text-[10px] text-ink-3 uppercase block">
              Direct Dependents
            </span>
            <span className="font-bold text-ink text-sm">
              {activeImpact?.direct_dependents?.length ?? 0}
            </span>
          </div>
          <div className="p-2.5 rounded bg-tile border border-line">
            <span className="text-[10px] text-ink-3 uppercase block">
              Transitive Blast Radius
            </span>
            <span className="font-bold text-ink text-sm">
              {activeImpact?.transitive_dependents?.length ?? selectedMeta.blastRadius}
            </span>
          </div>
          <div className="p-2.5 rounded bg-tile border border-line">
            <span className="text-[10px] text-ink-3 uppercase block">
              Entry Points Affected
            </span>
            <span className="font-bold text-ink text-sm">
              {activeImpact?.affected_entry_points?.length ?? 0}
            </span>
          </div>
          <div className="p-2.5 rounded bg-tile border border-line">
            <span className="text-[10px] text-ink-3 uppercase block">
              Available Protection Tests
            </span>
            <span className="font-bold text-teal-strong text-sm">
              {relatedTest ? `${relatedTest.test_count} cases` : '0 tests'}
            </span>
          </div>
        </div>
      </div>

      {/* Target AST Findings Card */}
      {relatedFindings.length > 0 && (
        <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-indigo" />
              Target AST Findings ({relatedFindings.length})
            </span>
            <span className="font-mono text-[11px] text-ink-3">
              Static Detections
            </span>
          </div>
          <div className="divide-y divide-line/60 bg-tile border border-line rounded-lg overflow-hidden text-xs max-h-48 overflow-y-auto custom-scrollbar">
            {relatedFindings.map((f, i) => (
              <div key={f.id || i} className="p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono font-bold text-ink mr-2">{f.rule_id}</span>
                  <span className="text-ink-3">{f.message}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold bg-surface border border-line shrink-0">
                  Line {f.line || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Before / After (Static Estimate) */}
      {selectedFile.changed && relatedHotspot && (
        <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-strong" />
              Risk Before &amp; After Modernization (Static Estimate)
            </span>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-tile border border-line text-ink-3">
              Static estimate
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded bg-tile border border-line space-y-1">
              <span className="text-[10px] text-ink-3 uppercase font-bold">
                BEFORE MODERNIZATION
              </span>
              <div className="text-ink">
                Hotspot Score:{' '}
                <strong>
                  {relatedHotspot.hotspotScore ?? relatedHotspot.hotspot_score ?? 60}
                </strong>
                /100
              </div>
              <div className="text-ink-2">
                Risk Level: <strong className="uppercase">{relatedHotspot.risk_level || 'high'}</strong>
              </div>
            </div>

            <div className="p-3 rounded bg-teal-surface/40 border border-teal/30 space-y-1">
              <span className="text-[10px] text-teal-text uppercase font-bold">
                AFTER (STATIC ESTIMATE)
              </span>
              <div className="text-ink">
                Hotspot Score:{' '}
                <strong className="text-teal-strong">
                  {Math.max(10, (relatedHotspot.hotspotScore ?? relatedHotspot.hotspot_score ?? 60) - 10)}
                </strong>
                /100 (-10 pts)
              </div>
              <div className="text-teal-strong font-semibold">
                Syntactic debt eliminated; runtime tests required.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diff Viewer with Original vs Proposed Code */}
      <DiffViewer
        filePath={selectedFile.relative_path}
        diffCode={selectedFile.unified_diff || ''}
        originalCode={selectedFile.original_code || ''}
        modernizedCode={selectedFile.refactored_code || ''}
        mode={mode}
        onModeChange={onModeChange}
        syntaxCheckPassed={syntaxCheckPassed}
        syntaxCheckStatusText={syntaxStateText}
        ruleWarning={ruleWarning}
        explanation={diffExplanation}
        emptyMessage={
          selectedFile.changed
            ? undefined
            : 'No generated diff — this candidate requires manual review.'
        }
      />

      {/* State-aware Human Review Checklist */}
      <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-indigo" />
            Human Review Checklist
          </span>
          <span className="text-[11px] font-mono text-ink-3">
            {selectedFile.changed ? 'Mandatory before merge' : 'No diff to review'}
          </span>
        </div>

        {selectedFile.changed ? (
          <div className="space-y-2 text-xs font-sans">
            {[
              {
                key: 'diffReviewed' as const,
                label: '1. Diff reviewed and syntax audited',
                desc: 'Inspected original vs proposed diff chunks for semantic preservation.',
              },
              {
                key: 'testsReviewed' as const,
                label: '2. Protection tests inspected',
                desc: 'Verified characterization tests cover all altered code paths.',
              },
              {
                key: 'impactChecked' as const,
                label: '3. Dependency blast radius checked',
                desc: `Evaluated downstream callers (${activeImpact?.transitive_dependents?.length ?? 1} transitive dependents).`,
              },
              {
                key: 'runtimeVerified' as const,
                label: '4. Runtime verification completed',
                desc: 'Executed automated regression suite locally or in sandbox.',
              },
              {
                key: 'approved' as const,
                label: '5. Approved for merge',
                desc: 'Final sign-off by repository maintainer.',
              },
            ].map((item) => {
              const isChecked = Boolean(
                reviewChecklist[selectedFile.relative_path]?.[item.key]
              );
              return (
                <label
                  key={item.key}
                  className={`flex items-start gap-2.5 p-2 rounded cursor-pointer transition-colors ${
                    isChecked ? 'bg-teal-surface/50 border border-teal/20' : 'hover:bg-tile'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() =>
                      onToggleChecklistItem(selectedFile.relative_path, item.key)
                    }
                    className="mt-0.5 rounded border-line text-indigo focus:ring-indigo"
                  />
                  <div>
                    <strong className="block text-ink">{item.label}</strong>
                    <span className="text-[11px] text-ink-3">{item.desc}</span>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-ink-3 italic">
            No review checklist required until a modernization proposal diff is generated.
          </p>
        )}
      </div>
    </div>
  );
};

export default CandidateReviewPanel;
