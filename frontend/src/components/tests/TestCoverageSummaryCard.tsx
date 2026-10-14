import React from 'react';
import { CheckCircle2, Lock, ChevronRight } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import KpiCard from '../common/KpiCard';
import { formatNumber } from '../../utils/formatters';
import { UnprotectedModuleDetail } from '../../types';

interface TestCoverageSummaryCardProps {
  totalGenFiles: number;
  syntaxValidCount: number;
  trustedDemo: boolean;
  totalCases: number;
  protectedModulesCount: number;
  totalSourceModules: number;
  protectionPercentage: number;
  unprotectedModulesList: UnprotectedModuleDetail[];
  strengthCounts: Record<string, number>;
  frameworkCoverage?: any;
  showTaxonomyDetails: boolean;
  onToggleTaxonomyDetails: () => void;
}

export const TestCoverageSummaryCard: React.FC<TestCoverageSummaryCardProps> = ({
  totalGenFiles,
  syntaxValidCount,
  trustedDemo,
  totalCases,
  protectedModulesCount,
  totalSourceModules,
  protectionPercentage,
  unprotectedModulesList,
  strengthCounts,
  frameworkCoverage,
  showTaxonomyDetails,
  onToggleTaxonomyDetails,
}) => {
  return (
    <>
      {/* State & Safety Clarity Banner */}
      <Card variant="secondary" padding="sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-teal-surface text-teal-strong flex items-center justify-center shrink-0 border border-teal/25">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-ink">
                  {totalGenFiles} TEST SUITES GENERATED · AST VALIDATED
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-surface text-teal-strong border border-teal/20">
                  {syntaxValidCount} / {totalGenFiles} SYNTAX OK
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-surface text-amber-strong border border-amber/30">
                  {trustedDemo ? 'SANDBOX READY' : 'EXECUTION: LOCAL RUNNER'}
                </span>
              </div>
              <p className="text-xs text-ink-3 mt-0.5">
                Contract characterization tests synthesized from AST signatures to pin current behavior before refactoring. Code coverage is measured when run in your test runner (pytest / vitest).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={showTaxonomyDetails ? 'indigo' : 'outline'}
              size="sm"
              onClick={onToggleTaxonomyDetails}
              className="text-xs"
            >
              <span>{showTaxonomyDetails ? 'Hide Taxonomy & Levels' : 'Taxonomy & Levels (L1–L5)'}</span>
              <ChevronRight
                className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${
                  showTaxonomyDetails ? 'rotate-90' : ''
                }`}
              />
            </Button>
          </div>
        </div>
      </Card>

      {/* Four Core KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="GENERATED TEST FILES"
          value={formatNumber(totalGenFiles)}
          subtext={`${formatNumber(totalCases)} generated assertions`}
        />
        <KpiCard
          label="SYNTAX VALIDATION"
          value={`${syntaxValidCount} / ${totalGenFiles}`}
          variant={syntaxValidCount === totalGenFiles ? 'default' : 'risk'}
          subtext="Static AST grammar parse"
        />
        <KpiCard
          label="SOURCE PROTECTION"
          value={`${protectedModulesCount} / ${totalSourceModules}`}
          variant="selected"
          subtext={`${protectionPercentage}% source modules protected`}
        />
        <KpiCard
          label="EXECUTION STATUS"
          value={trustedDemo ? 'Sandbox Ready' : 'Local Runner'}
          subtext={trustedDemo ? 'Disposable runner verified' : 'Download ZIP to execute'}
        />
      </div>

      {/* Collapsible Taxonomy & Framework Archetypes Breakdown */}
      {showTaxonomyDetails && (
        <div className="space-y-3 animate-[fade-down_150ms_ease-out]">
          {/* Verification Pipeline Ladder */}
          <Card variant="secondary" padding="sm">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3">
                VERIFICATION PIPELINE LADDER
              </span>
              <span className="text-[11px] font-mono text-ink-3">Static vs Runtime Distinction</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 pt-1">
              <div className="bg-teal-surface/60 border border-teal/20 rounded p-2 text-center">
                <div className="text-[10px] font-bold text-teal-strong uppercase flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 1. GENERATED
                </div>
                <div className="text-[11px] font-mono font-bold text-ink mt-0.5">{totalGenFiles} Suites</div>
              </div>

              <div className="bg-teal-surface/60 border border-teal/20 rounded p-2 text-center">
                <div className="text-[10px] font-bold text-teal-strong uppercase flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 2. SYNTAX VALID
                </div>
                <div className="text-[11px] font-mono font-bold text-ink mt-0.5">{syntaxValidCount} / {totalGenFiles} Passed</div>
              </div>

              <div className="bg-teal-surface/60 border border-teal/20 rounded p-2 text-center">
                <div className="text-[10px] font-bold text-teal-strong uppercase flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 3. IMPORT VALID
                </div>
                <div className="text-[11px] font-mono font-bold text-ink mt-0.5">AST Verified</div>
              </div>

              <div className="bg-amber-surface/40 border border-amber/30 rounded p-2 text-center">
                <div className="text-[10px] font-bold text-amber-strong uppercase flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> 4. RUNTIME EXECUTED
                </div>
                <div className="text-[11px] font-mono font-semibold text-amber-text mt-0.5">
                  {trustedDemo ? 'Ready in Sandbox' : 'Safety Locked'}
                </div>
              </div>

              <div className="bg-tile border border-line rounded p-2 text-center">
                <div className="text-[10px] font-bold text-ink-3 uppercase flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> 5. BEHAVIOR VERIFIED
                </div>
                <div className="text-[11px] font-mono text-ink-3 mt-0.5">Run Locally via ZIP</div>
              </div>
            </div>
          </Card>

          {/* 3 Supporting Distribution Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Protection Progress Card */}
            <div className="bg-surface border border-line rounded-lg p-4 shadow-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3">
                    SOURCE PROTECTION PROGRESS
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo">
                    {protectedModulesCount} / {totalSourceModules} · {protectionPercentage}%
                  </span>
                </div>

                {/* Segmented Progress Bar */}
                <div className="w-full h-3.5 bg-track rounded-pill overflow-hidden flex p-0.5 gap-0.5 border border-line/60">
                  <div
                    className="bg-indigo rounded-pill transition-all duration-300"
                    style={{ width: `${Math.max(4, protectionPercentage)}%` }}
                    title={`Protected modules: ${protectedModulesCount}`}
                  />
                  <div
                    className="bg-amber-strong/40 rounded-pill transition-all duration-300 flex-1"
                    title={`Unprotected modules: ${unprotectedModulesList.length}`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] mt-2 font-medium text-ink-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo inline-block" />
                    Protected: <strong>{protectedModulesCount}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-strong/40 inline-block" />
                    Unprotected: <strong>{unprotectedModulesList.length}</strong>
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-ink-3 mt-3 pt-2.5 border-t border-line/60">
                A source module is protected when it possesses a valid characterization test covering callable exports.
              </p>
            </div>

            {/* Test Strength Distribution Card */}
            <div className="bg-surface border border-line rounded-lg p-4 shadow-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  TEST STRENGTH LEVELS
                </span>
                <span className="text-[10px] text-ink-3 font-mono">AST Taxonomy</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 text-center pt-1">
                <div className="bg-tile rounded p-1.5 border border-line">
                  <div className="text-[9px] font-bold text-ink-3">L1</div>
                  <div className="text-[10px] font-semibold text-ink">SYNTAX</div>
                  <div className="text-xs font-mono font-bold text-indigo mt-0.5">{strengthCounts.syntax || 0}</div>
                </div>
                <div className="bg-tile rounded p-1.5 border border-line">
                  <div className="text-[9px] font-bold text-ink-3">L2</div>
                  <div className="text-[10px] font-semibold text-ink">IMPORT</div>
                  <div className="text-xs font-mono font-bold text-indigo mt-0.5">{strengthCounts.import || 0}</div>
                </div>
                <div className="bg-indigo-surface rounded p-1.5 border border-indigo/20">
                  <div className="text-[9px] font-bold text-indigo">L3</div>
                  <div className="text-[10px] font-bold text-indigo-text">CONTRACT</div>
                  <div className="text-xs font-mono font-bold text-indigo mt-0.5">{strengthCounts.contract || totalGenFiles}</div>
                </div>
                <div className="bg-tile rounded p-1.5 border border-line">
                  <div className="text-[9px] font-bold text-ink-3">L4</div>
                  <div className="text-[10px] font-semibold text-ink">BEHAVIOR</div>
                  <div className="text-xs font-mono font-bold text-indigo mt-0.5">{strengthCounts.behavior || 0}</div>
                </div>
                <div className="bg-tile rounded p-1.5 border border-line">
                  <div className="text-[9px] font-bold text-ink-3">L5</div>
                  <div className="text-[10px] font-semibold text-ink">INTEGR.</div>
                  <div className="text-xs font-mono font-bold text-ink-3 mt-0.5">{strengthCounts.integration || 0}</div>
                </div>
              </div>

              <p className="text-[10px] text-ink-3 mt-2.5 pt-2 border-t border-line/60">
                L3 Contract tests guarantee callable signatures and boundary error resistance without invoking side effects.
              </p>
            </div>

            {/* Framework Archetype Coverage Card */}
            <div className="bg-surface border border-line rounded-lg p-4 shadow-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  GENERATION BY ARCHETYPE
                </span>
                <span className="text-[10px] text-teal-strong font-semibold">Framework-Aware</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-1 px-2 rounded bg-tile">
                  <span className="text-ink-2 font-medium">React / TSX Components</span>
                  <span className="font-mono text-ink font-semibold">
                    {frameworkCoverage?.react ? `${frameworkCoverage.react.protected} / ${frameworkCoverage.react.total}` : 'Vitest + RTL'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1 px-2 rounded bg-tile">
                  <span className="text-ink-2 font-medium">FastAPI Routes &amp; Endpoints</span>
                  <span className="font-mono text-ink font-semibold">
                    {frameworkCoverage?.fastapi ? `${frameworkCoverage.fastapi.protected} / ${frameworkCoverage.fastapi.total}` : 'API Contract'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1 px-2 rounded bg-tile">
                  <span className="text-ink-2 font-medium">Python Service Layer</span>
                  <span className="font-mono text-ink font-semibold">
                    {frameworkCoverage?.service ? `${frameworkCoverage.service.protected} / ${frameworkCoverage.service.total}` : 'Mocked DB/Redis'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1 px-2 rounded bg-tile">
                  <span className="text-ink-2 font-medium">ML &amp; Data Pipeline Models</span>
                  <span className="font-mono text-ink font-semibold">
                    {frameworkCoverage?.ml ? `${frameworkCoverage.ml.protected} / ${frameworkCoverage.ml.total}` : 'Shape Contract'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TestCoverageSummaryCard;
