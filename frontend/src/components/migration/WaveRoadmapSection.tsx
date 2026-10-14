import React from 'react';
import {
  CheckSquare,
  Compass,
  ShieldCheck,
  Square,
} from 'lucide-react';
import { MigrationPlanResponse, TabType } from '../../types';
import { truncateMiddle } from '../../utils/formatters';
import { getWaveResidualRisk } from '../../utils/presentation';
import { FilterChip } from '../common/Chips';
import { StatusTag } from '../common/Tags';

interface WaveRoadmapSectionProps {
  plan: MigrationPlanResponse;
  cycleCount: number;
  selectedWaveFilter: number | null;
  onSelectWaveFilter: (wave: number | null) => void;
  selectedId: string;
  onSelectFile?: (filePath: string) => void;
  completedTasks: Record<string, boolean>;
  onToggleTask: (taskId: string) => void;
  onNavigateTab?: (tab: TabType) => void;
}

export const WaveRoadmapSection: React.FC<WaveRoadmapSectionProps> = ({
  plan,
  cycleCount,
  selectedWaveFilter,
  onSelectWaveFilter,
  selectedId,
  onSelectFile,
  completedTasks,
  onToggleTask,
  onNavigateTab,
}) => {
  return (
    <section className="space-y-4 animate-[fade-in_150ms_ease-out]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-base text-ink">
            Migration Waves Roadmap
          </h3>
          <p className="font-sans text-xs text-ink-3 mt-0.5">
            Topologically ordered execution waves designed to isolate risk and prevent cascading regressions.
          </p>
        </div>

        {/* Wave Filter Chips */}
        {plan.waves && plan.waves.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              label={`ALL WAVES (${plan.waves.length})`}
              active={selectedWaveFilter === null}
              onClick={() => onSelectWaveFilter(null)}
            />
            {plan.waves.map((w) => (
              <FilterChip
                key={w.wave}
                label={`WAVE ${w.wave}`}
                active={selectedWaveFilter === w.wave}
                onClick={() => onSelectWaveFilter(w.wave)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Migration Progression Flow Graphic */}
      <div className="p-4 bg-surface border border-line rounded-xl shadow-xs space-y-3">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-3 block">
          Staged Execution Dependency Flow:
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-surface/30 border border-red-line text-ink font-bold">
            <span className="w-2 h-2 rounded-full bg-red-strong" />
            <span>PROTECT (W0)</span>
          </div>
          <span className="text-ink-3 font-bold">&rarr;</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-surface/30 border border-teal/20 text-ink font-bold">
            <span className="w-2 h-2 rounded-full bg-teal-strong" />
            <span>LEAVES (W1)</span>
          </div>
          <span className="text-ink-3 font-bold">&rarr;</span>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold ${
              cycleCount === 0
                ? 'bg-tile border-line text-ink-3'
                : 'bg-amber-surface/30 border-amber-line text-ink'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cycleCount === 0 ? 'bg-ink-3' : 'bg-amber-strong'
              }`}
            />
            <span>CYCLES (W2){cycleCount === 0 ? ' — NOT REQUIRED' : ''}</span>
          </div>
          <span className="text-ink-3 font-bold">&rarr;</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-surface/30 border border-indigo/20 text-ink font-bold">
            <span className="w-2 h-2 rounded-full bg-indigo" />
            <span>CORE SERVICES (W3)</span>
          </div>
          <span className="text-ink-3 font-bold">&rarr;</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-line text-ink font-bold">
            <span className="w-2 h-2 rounded-full bg-ink" />
            <span>ENTRY POINTS (W4)</span>
          </div>
        </div>
      </div>

      {/* Waves List */}
      <div className="space-y-4">
        {(plan.waves && plan.waves.length > 0
          ? plan.waves.filter((w) => selectedWaveFilter === null || w.wave === selectedWaveFilter)
          : []
        ).map((wave) => {
          const residualRisk = getWaveResidualRisk(wave.wave, cycleCount);
          const isNotRequired = wave.status === 'not_required';

          return (
            <article
              key={wave.wave}
              className={`bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4 transition-all ${
                isNotRequired ? 'opacity-80' : ''
              }`}
            >
              {/* Wave Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-line">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-md bg-ink text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    W{wave.wave}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display font-bold text-ink text-sm sm:text-base">
                        {wave.title}
                      </h4>
                      {isNotRequired ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-tile text-ink-3 border border-line">
                          NOT REQUIRED
                        </span>
                      ) : (
                        <StatusTag
                          status={wave.risk_level}
                          label={wave.risk_level.toUpperCase()}
                        />
                      )}
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-tile border border-line text-ink-3">
                        CONFIDENCE: {wave.confidence?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </div>
                    <p className="text-xs text-ink-3 mt-0.5 font-medium">
                      <strong className="text-ink font-sans">Goal:</strong> {wave.goal}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-ink-3">
                  <span className="px-2 py-0.5 rounded-pill bg-tile border border-line">
                    {wave.files.length} {wave.files.length === 1 ? 'file' : 'files'}
                  </span>
                  <span className="px-2 py-0.5 rounded-pill bg-tile border border-line">
                    Protection: <strong className="text-ink">{wave.protection_readiness_pct || 0}%</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded-pill bg-tile border border-line">
                    Ripple: <strong className="text-ink">{wave.total_transitive_blast_radius}</strong>
                  </span>
                </div>
              </div>

              {/* Why this wave comes first / next (Topological Rationale) */}
              <div className="p-3.5 bg-indigo-surface/40 border border-indigo/20 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  <Compass className="w-3.5 h-3.5 text-indigo shrink-0" />
                  <span>Why this wave comes first / next:</span>
                </div>
                <p className="text-ink-2 leading-relaxed pl-5">
                  {wave.strategy}
                </p>
              </div>

              {/* Wave Files (Click to inspect in blast radius) */}
              {wave.files.length > 0 ? (
                <div>
                  <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wider block mb-2">
                    Files in this wave ({wave.files.length}) &bull; Click to inspect blast radius:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                    {wave.files.map((file) => (
                      <button
                        key={file}
                        type="button"
                        onClick={() => onSelectFile?.(file)}
                        className={`font-mono text-xs px-2.5 py-1 rounded-md border transition-colors ${
                          selectedId === file
                            ? 'bg-indigo-surface text-indigo-text font-bold border-indigo/30'
                            : 'bg-surface text-ink border-line hover:bg-tile'
                        }`}
                      >
                        {truncateMiddle(file, 28)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                isNotRequired && (
                  <div className="p-3 rounded-lg bg-tile border border-line text-xs text-ink-3 italic">
                    No files assigned &bull; Dependency cycles were not detected in this project.
                  </div>
                )
              )}

              {/* Suggested Tests & Wave Checklist */}
              {!isNotRequired && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Suggested Test Order */}
                  <div className="bg-tile border border-line rounded-md p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink block">
                        Suggested Protection Tests to Run:
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateTab?.('tests')}
                        className="text-[11px] font-semibold text-teal-strong hover:underline"
                      >
                        Open Safety Tests &rarr;
                      </button>
                    </div>

                    {wave.suggested_test_order && wave.suggested_test_order.length > 0 ? (
                      <ol className="space-y-1 list-decimal pl-4 font-mono text-[11px] text-ink-2 max-h-36 overflow-y-auto custom-scrollbar">
                        {wave.suggested_test_order.slice(0, 6).map((testPath, idx) => (
                          <li key={idx} className="truncate" title={testPath}>
                            {testPath}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-xs text-ink-3 italic">
                        Run general project tests before and after modifying this wave.
                      </p>
                    )}
                  </div>

                  {/* Checklist */}
                  <div className="bg-tile border border-line rounded-md p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                        <CheckSquare className="w-3.5 h-3.5 text-teal-strong" />
                        <span>Wave Checklist:</span>
                      </div>
                      <span className="text-[10px] font-mono text-ink-3 font-semibold">
                        {(wave.checklist || []).filter((c) => completedTasks[c.id]).length} / {(wave.checklist || []).length} done
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                      {(wave.checklist || []).map((item) => {
                        const isDone = Boolean(completedTasks[item.id]);
                        return (
                          <div
                            key={item.id}
                            role="checkbox"
                            aria-checked={isDone}
                            tabIndex={0}
                            onClick={() => onToggleTask(item.id)}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                onToggleTask(item.id);
                              }
                            }}
                            className={`flex items-start gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
                              isDone ? 'bg-teal-surface text-teal-strong line-through' : 'hover:bg-surface text-ink-2'
                            }`}
                          >
                            {isDone ? (
                              <CheckSquare className="mt-0.5 w-3.5 h-3.5 shrink-0 text-teal-strong" />
                            ) : (
                              <Square className="mt-0.5 w-3.5 h-3.5 shrink-0 text-ink-3" />
                            )}
                            <span className="leading-snug">{item.task}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Residual Risk Remaining Box */}
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                  residualRisk.riskLevel === 'high'
                    ? 'bg-amber-surface/40 border-amber-line/70'
                    : residualRisk.riskLevel === 'medium'
                    ? 'bg-indigo-surface/30 border-indigo/20'
                    : 'bg-teal-surface/30 border-teal/20'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-ink flex-wrap">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-strong shrink-0" />
                  <span>Residual Risk Remaining After Wave {wave.wave}:</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-pill font-sans uppercase tracking-wider font-bold border ${
                      residualRisk.riskLevel === 'high'
                        ? 'bg-amber-surface text-amber-text border-amber-line/60'
                        : residualRisk.riskLevel === 'medium'
                        ? 'bg-amber-surface/70 text-amber-text border-amber-line/40'
                        : 'bg-teal-surface text-teal-text border-teal/25'
                    }`}
                  >
                    {residualRisk.label}
                  </span>
                </div>
                <p className="text-ink-2 pl-5 leading-relaxed">
                  {residualRisk.description}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
