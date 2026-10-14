import React from 'react';
import {
  BookOpen,
  ChevronDown,
  AlertTriangle,
  Target,
  Network,
  Play,
  Wand2,
} from 'lucide-react';
import { WarningInfo, ModuleAnalysis } from '../../types';
import { truncateMiddle, formatNumber } from '../../utils/formatters';
import { getModuleRole, getEntryPointCategory } from '../../utils/architectureUtils';
import Button from '../common/Button';
import SearchField from '../common/SearchField';
import { FilterChip } from '../common/Chips';
import { LanguageTag } from '../common/Tags';
import EmptyState from '../common/EmptyState';
import Card from '../common/Card';

interface ModuleExplanationListProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredModules: ModuleAnalysis[];
  totalModulesCount: number;
  languageFilter: string;
  setLanguageFilter: (l: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  roleFilter: string;
  setRoleFilter: (r: string) => void;
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  expandedModules: Set<string>;
  toggleModule: (id: string) => void;
  cycleNodeIds: Set<string>;
  onInspectInGraph: (path?: string) => void;
  onAnalyzeImpact: (path?: string) => void;
  onGenerateTests: (path?: string) => void;
  onReviewModernization: (path?: string) => void;
  onClearFilters: () => void;
}

export const ModuleExplanationList: React.FC<ModuleExplanationListProps> = ({
  searchQuery,
  setSearchQuery,
  filteredModules,
  totalModulesCount,
  languageFilter,
  setLanguageFilter,
  statusFilter,
  setStatusFilter,
  roleFilter,
  setRoleFilter,
  visibleCount,
  setVisibleCount,
  expandedModules,
  toggleModule,
  cycleNodeIds,
  onInspectInGraph,
  onAnalyzeImpact,
  onGenerateTests,
  onReviewModernization,
  onClearFilters,
}) => {
  return (
    <div className="space-y-3 animate-[fade-up_200ms_ease-out_both]">
      <Card variant="primary" padding="md" className="space-y-3">
        {/* Search Bar + Quick Syntax Hints */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <SearchField
            id="explanation-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search path, symbol, or filter (e.g. role:service, parse:partial, entry:runtime)…"
            resultCount={{
              current: filteredModules.length,
              total: totalModulesCount,
              unit: 'modules',
            }}
            className="w-full lg:w-96"
          />

          {/* Quick Syntax Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-ink-3">
            <span className="text-ink-4">Syntax:</span>
            <button
              type="button"
              onClick={() => setSearchQuery('role:service')}
              className="px-1.5 py-0.5 rounded bg-panel hover:bg-track border border-line text-ink-2"
            >
              role:service
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery('parse:partial')}
              className="px-1.5 py-0.5 rounded bg-panel hover:bg-track border border-line text-ink-2"
            >
              parse:partial
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery('entry:runtime')}
              className="px-1.5 py-0.5 rounded bg-panel hover:bg-track border border-line text-ink-2"
            >
              entry:runtime
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-1.5 py-0.5 rounded text-red hover:underline font-sans text-xs ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line/60">
          {/* Language filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-ink-2 mr-1">Language:</span>
            <FilterChip label="ALL" active={languageFilter === 'all'} onClick={() => setLanguageFilter('all')} />
            <FilterChip label="PYTHON" active={languageFilter === 'python'} onClick={() => setLanguageFilter('python')} />
            <FilterChip label="TYPESCRIPT" active={languageFilter === 'typescript'} onClick={() => setLanguageFilter('typescript')} />
            <FilterChip label="JAVASCRIPT" active={languageFilter === 'javascript'} onClick={() => setLanguageFilter('javascript')} />
          </div>

          {/* Parse Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-ink-2 mr-1">Parse:</span>
            <FilterChip label="ALL" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
            <FilterChip label="FULL AST" active={statusFilter === 'complete'} onClick={() => setStatusFilter('complete')} />
            <FilterChip label="PARTIAL" active={statusFilter === 'partial'} onClick={() => setStatusFilter('partial')} />
            <FilterChip label="FALLBACK" active={statusFilter === 'fallback'} onClick={() => setStatusFilter('fallback')} />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-ink-2 mr-1">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="font-mono text-xs bg-surface border border-line rounded px-2 py-1 text-ink focus:outline-indigo"
            >
              <option value="all">ALL ROLES</option>
              <option value="domain">DOMAIN</option>
              <option value="application_service">SERVICE</option>
              <option value="api">API / ROUTE</option>
              <option value="ml">ML PIPELINE</option>
              <option value="ui">UI</option>
              <option value="persistence">PERSISTENCE</option>
              <option value="configuration">CONFIG</option>
              <option value="script">SCRIPT</option>
              <option value="test">TEST</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Module Accordion Rows */}
      <div className="space-y-2.5" role="region" aria-label="Analyzed Modules List">
        {filteredModules.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={BookOpen}
              headline="No Modules Match Query"
              description="No analyzed modules match your filters."
              actionText="Clear Search & Filters"
              onAction={onClearFilters}
              iconVariant="muted"
            />
          </div>
        ) : (
          filteredModules.slice(0, visibleCount).map((mod) => {
            const isExpanded = expandedModules.has(mod.module_id);
            const { label: roleLabel } = getModuleRole(mod.relative_path);
            const { kind, label: entryLabel } = getEntryPointCategory(mod.relative_path);
            const pStatus = mod.parse_status || 'complete';
            const inCycle = cycleNodeIds.has(mod.module_id);

            const warningGroups: Record<string, WarningInfo[]> = {};
            for (const warning of mod.legacy_warnings || []) {
              if (!warningGroups[warning.code]) {
                warningGroups[warning.code] = [];
              }
              warningGroups[warning.code].push(warning);
            }

            return (
              <div
                key={mod.module_id}
                className="bg-surface border border-line rounded-lg overflow-hidden transition-all shadow-1"
              >
                {/* Accordion Header Row */}
                <button
                  type="button"
                  onClick={() => toggleModule(mod.module_id)}
                  aria-expanded={isExpanded}
                  aria-controls={`module-body-${mod.module_id}`}
                  className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-tile/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChevronDown
                      className={`w-4 h-4 text-ink-3 shrink-0 transition-transform duration-base ${
                        isExpanded ? 'rotate-180 text-ink' : ''
                      }`}
                      strokeWidth={1.75}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-mono text-[13px] font-semibold text-indigo-text truncate"
                          title={mod.relative_path}
                        >
                          {truncateMiddle(mod.relative_path, 38)}
                        </span>
                        <LanguageTag language={mod.language} />

                        {/* Parse Status Badge */}
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap border ${
                            pStatus === 'complete'
                              ? 'bg-teal-surface text-teal-strong border-teal/20'
                              : pStatus === 'partial'
                              ? 'bg-amber-surface text-amber-strong border-amber/30'
                              : 'bg-red-surface text-red-strong border-red-line'
                          }`}
                        >
                          {pStatus === 'complete' ? 'FULL AST' : `PARSE: ${pStatus.toUpperCase()}`}
                        </span>

                        {/* Entry Point Badge */}
                        {(kind !== 'unknown' || mod.is_entry_point) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-surface text-teal-strong border border-teal/30 whitespace-nowrap">
                            ENTRY: {entryLabel}
                          </span>
                        )}

                        {/* Module Role Badge */}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-surface text-indigo border border-indigo/20 whitespace-nowrap">
                          ROLE: {roleLabel.toUpperCase()}
                        </span>

                        {inCycle && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-surface text-red-strong border border-red-line whitespace-nowrap">
                            CYCLE: RESOLVED GRAPH
                          </span>
                        )}
                      </div>

                      {mod.explanation?.responsibility && (
                        <p className="font-sans text-xs text-ink-3 mt-1 truncate max-w-xl">
                          {mod.explanation.responsibility}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right side stats + complexity */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden md:inline-block font-sans text-xs text-ink-3 num font-mono">
                      {formatNumber(mod.line_count)} lines · {mod.classes.length} classes · {mod.functions.length} functions
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                        mod.complexity.rating === 'critical'
                          ? 'bg-red-surface text-red-strong border-red-line'
                          : mod.complexity.rating === 'high'
                          ? 'bg-amber-surface text-amber-strong border-amber/30'
                          : 'bg-surface text-ink-2 border-line'
                      }`}
                    >
                      COMPLEXITY: {mod.complexity.rating.toUpperCase()} ({mod.complexity.cyclomatic_complexity})
                    </span>
                  </div>
                </button>

                {/* Accordion Expanded Body */}
                {isExpanded && (
                  <div
                    id={`module-body-${mod.module_id}`}
                    className="px-5 pb-5 pt-3 border-t border-line/80 bg-tile/30 space-y-4 animate-[fade-up_150ms_ease-out_both]"
                  >
                    {/* Quick navigation actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onInspectInGraph(mod.relative_path)}
                        icon={<Network className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        Inspect in Dependency Map
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAnalyzeImpact(mod.relative_path)}
                        icon={<Target className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        Analyze Impact
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onGenerateTests(mod.relative_path)}
                        icon={<Play className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        Generate Safety Tests
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReviewModernization(mod.relative_path)}
                        icon={<Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        Review Modernization Proposals
                      </Button>
                    </div>

                    {/* Parser Confidence & Role Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-surface p-3 rounded-lg border border-line">
                      <div>
                        <span className="text-ink-4 text-[10px] uppercase font-bold block">Architectural Role</span>
                        <span className="font-bold text-ink">{roleLabel}</span>
                      </div>
                      <div>
                        <span className="text-ink-4 text-[10px] uppercase font-bold block">Parser Confidence</span>
                        <span className="font-bold text-ink">
                          {pStatus === 'complete' ? 'High (Full AST Tree)' : pStatus === 'partial' ? 'Medium (Syntax Fallback)' : 'Low'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-4 text-[10px] uppercase font-bold block">Entry Point Status</span>
                        <span className="font-bold text-ink">
                          {kind !== 'unknown' ? entryLabel : mod.is_entry_point ? 'Executable Script' : 'Internal Component'}
                        </span>
                      </div>
                    </div>

                    {/* Legacy Warnings Breakdown */}
                    {Object.keys(warningGroups).length > 0 && (
                      <div className="bg-amber-surface border border-amber/30 rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-strong">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Legacy Code Findings ({mod.legacy_warnings.length}):</span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {Object.entries(warningGroups).map(([code, warnings]) => {
                            const warnList = warnings as WarningInfo[];
                            return (
                              <div key={code} className="text-xs bg-surface/80 rounded p-2 border border-amber/20">
                                <span className="font-mono font-bold text-amber-strong mr-2">{code}</span>
                                <span className="text-ink-2">{warnList[0]?.message}</span>
                                {warnList.length > 1 && (
                                  <span className="ml-2 text-ink-3">({warnList.length} occurrences)</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Classes & Functions details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {/* Classes */}
                      <div className="bg-surface rounded-md border border-line p-3">
                        <span className="font-sans text-[11px] font-bold text-ink-2 uppercase tracking-wider block mb-2">
                          Classes ({mod.classes.length})
                        </span>
                        {mod.classes.length === 0 ? (
                          <span className="text-xs text-ink-3 italic">No classes defined.</span>
                        ) : (
                          <ul className="space-y-1 text-xs font-mono text-ink">
                            {mod.classes.map((cls) => (
                              <li key={cls.symbol_id} className="truncate">
                                class <span className="font-bold text-indigo-text">{cls.name}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Functions */}
                      <div className="bg-surface rounded-md border border-line p-3">
                        <span className="font-sans text-[11px] font-bold text-ink-2 uppercase tracking-wider block mb-2">
                          Functions ({mod.functions.length})
                        </span>
                        {mod.functions.length === 0 ? (
                          <span className="text-xs text-ink-3 italic">No standalone functions.</span>
                        ) : (
                          <ul className="space-y-1 text-xs font-mono text-ink max-h-36 overflow-y-auto custom-scrollbar">
                            {mod.functions.map((fn) => (
                              <li key={fn.symbol_id} className="truncate">
                                def <span className="font-semibold text-teal-strong">{fn.name}</span>({fn.parameters?.map((p) => p.name).join(', ')})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Imports Resolved & Unresolved */}
                    {mod.imports && mod.imports.length > 0 && (
                      <div className="bg-surface rounded-md border border-line p-3">
                        <span className="font-sans text-[11px] font-bold text-ink-2 uppercase tracking-wider block mb-2">
                          Direct Imports ({mod.imports.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                          {mod.imports.map((imp, idx) => {
                            const isAlias = imp.module_name.startsWith('@/') || imp.module_name.startsWith('~/');
                            return (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded-pill font-mono text-[11px] border ${
                                  isAlias
                                    ? 'bg-amber-surface text-amber-strong border-amber/30'
                                    : 'bg-track text-ink-2 border-line'
                                }`}
                                title={isAlias ? 'Requires path alias resolution' : imp.module_name}
                              >
                                {imp.module_name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Load more button if large count */}
        {filteredModules.length > visibleCount && (
          <div className="pt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((prev) => prev + 60)}
            >
              Show More Modules ({filteredModules.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleExplanationList;
