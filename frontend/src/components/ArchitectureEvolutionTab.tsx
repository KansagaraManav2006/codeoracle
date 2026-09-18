import React, { useEffect, useState } from 'react';
import {
  Layers,
  AlertTriangle,
  RefreshCw,
  Info,
  GitBranch,
  FileCode,
  CheckCircle2,
  Database,
  Cpu,
  Zap,
  ListOrdered,
} from 'lucide-react';
import {
  ArchitectureEvolutionResponse,
  ArchCharacteristics,
  ProposedArchChange,
} from '../types';
import RiskBadge from './common/RiskBadge';

interface Props {
  projectId?: string | null;
}

export const ArchitectureEvolutionTab: React.FC<Props> = ({ projectId }) => {
  const [data, setData] = useState<ArchitectureEvolutionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChange, setSelectedChange] = useState<ProposedArchChange | null>(null);

  const fetchEvolution = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/architecture-evolution`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result: ArchitectureEvolutionResponse = await res.json();
      setData(result);
      if (result.proposed_changes.length > 0 && !selectedChange) {
        setSelectedChange(result.proposed_changes[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch architecture evolution analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchEvolution();
    } else {
      setData(null);
    }
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-10 text-center text-sm font-medium text-[#6B645A]">
        Ingest a repository to view its current architecture and proposed evolution plan.
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-[#F0EBE2] rounded-xl w-1/3"></div>
        <div className="h-64 bg-[#EFE9DD]/60 rounded-[20px]"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-[24px] border border-[#ECC7C3] bg-[#F6E5E2] p-8 text-center text-xs font-bold text-[#8F3F3A]">
        <AlertTriangle className="mx-auto h-8 w-8 text-[#C45F58] mb-2" />
        <p>{error}</p>
        <button
          onClick={fetchEvolution}
          className="mt-4 btn-brand-pill px-4 py-2 text-xs inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Architecture Analysis</span>
        </button>
      </div>
    );
  }

  if (!data) return null;

  const chars: ArchCharacteristics = data.characteristics;

  return (
    <div className="space-y-6">
      {/* 1. Top Banner */}
      <section className="flex flex-col gap-4 rounded-[28px] border-2 border-[#D8CFC2] bg-[#FFFDFC] p-5 md:flex-row md:items-center md:justify-between shadow-warm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#EAE9FB] text-[#4340A0] rounded-2xl border border-[#C7C4F7] shadow-xs">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#181715] sm:text-lg">
              Architecture Evolution: CURRENT vs PROPOSED
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-[#6B645A]">
              Empirical current architecture map vs target 4-tier service-oriented target model.
            </p>
          </div>
        </div>

        <button
          onClick={fetchEvolution}
          disabled={loading}
          className="p-2 rounded-full border border-[#D8CFC2] bg-[#F7F4EE] hover:bg-[#181715] hover:text-white text-[#5C554D] transition-colors self-start sm:self-auto"
          title="Refresh Architecture Analysis"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </section>

      {/* Advisory Disclaimer Notice */}
      <div className="rounded-2xl border border-[#C7C4F7] bg-[#EAE9FB]/70 p-3.5 text-xs font-semibold text-[#4340A0] flex items-center gap-2.5 shadow-xs">
        <Info className="h-4 w-4 shrink-0 text-[#4C4FD6]" />
        <span>{data.disclaimer}</span>
      </div>

      {/* 2. Side-by-Side Diagram: CURRENT vs PROPOSED */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CURRENT ARCHITECTURE CARD */}
        <div className="rounded-[28px] border-2 border-[#D8CFC2] bg-[#FFFDFC] p-6 shadow-warm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#EAE3D6] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-base font-black text-[#181715]">
                  CURRENT ARCHITECTURE
                </h3>
              </div>
              <span className="rounded-full bg-[#FEF3E2] px-3 py-1 text-[10px] font-extrabold uppercase text-[#92400E] border border-[#E6D3A9]">
                Detected AST Map
              </span>
            </div>

            <div className="space-y-4">
              {/* API & Presentation Layer */}
              <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE] p-4">
                <div className="flex items-center justify-between text-xs font-black text-[#181715] mb-2">
                  <span>API & Presentation Layer</span>
                  <span className="text-[10px] text-[#4C4FD6] font-bold">
                    {data.current_architecture["api_presentation"]?.length || 0} modules
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-[#5C554D]">
                  {data.current_architecture["api_presentation"]?.slice(0, 4).map((mod) => (
                    <div key={mod.module_id} className="flex items-center gap-1.5 truncate">
                      <FileCode className="h-3 w-3 text-[#4C4FD6] shrink-0" />
                      <span className="truncate">{mod.relative_path}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow Connection */}
              <div className="text-center font-bold text-xs text-[#8C8275]">↓ Direct Import Coupling</div>

              {/* Service & Business Layer */}
              <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE] p-4">
                <div className="flex items-center justify-between text-xs font-black text-[#181715] mb-2">
                  <span>Service & Business Logic Layer</span>
                  <span className="text-[10px] text-[#4C4FD6] font-bold">
                    {data.current_architecture["service_business"]?.length || 0} modules
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-[#5C554D]">
                  {data.current_architecture["service_business"]?.slice(0, 4).map((mod) => (
                    <div key={mod.module_id} className="flex items-center gap-1.5 truncate">
                      <Cpu className="h-3 w-3 text-[#C7953D] shrink-0" />
                      <span className="truncate">{mod.relative_path}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow Connection */}
              <div className="text-center font-bold text-xs text-[#8C8275]">↓ Direct ORM Queries</div>

              {/* Data & Persistence Layer */}
              <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE] p-4">
                <div className="flex items-center justify-between text-xs font-black text-[#181715] mb-2">
                  <span>Data & Persistence Layer</span>
                  <span className="text-[10px] text-[#4C4FD6] font-bold">
                    {data.current_architecture["data_persistence"]?.length || 0} modules
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-[#5C554D]">
                  {data.current_architecture["data_persistence"]?.slice(0, 4).map((mod) => (
                    <div key={mod.module_id} className="flex items-center gap-1.5 truncate">
                      <Database className="h-3 w-3 text-[#248A46] shrink-0" />
                      <span className="truncate">{mod.relative_path}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PROPOSED TARGET ARCHITECTURE CARD */}
        <div className="rounded-[28px] border-2 border-[#4C4FD6] bg-[#FFFDFC] p-6 shadow-warm flex flex-col justify-between ring-2 ring-[#4C4FD6]/20">
          <div>
            <div className="flex items-center justify-between border-b border-[#EAE3D6] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-black text-[#181715]">
                  PROPOSED TARGET ARCHITECTURE
                </h3>
              </div>
              <span className="rounded-full bg-[#EAE9FB] px-3 py-1 text-[10px] font-extrabold uppercase text-[#4340A0] border border-[#C7C4F7]">
                Target 4-Tier Model
              </span>
            </div>

            <div className="space-y-4">
              {Object.entries(data.proposed_architecture).map(([layerName, items], idx) => (
                <div key={layerName} className="space-y-2">
                  <div className="rounded-2xl border border-[#C7C4F7] bg-[#EAE9FB]/50 p-4">
                    <div className="flex items-center justify-between text-xs font-black text-[#4340A0] mb-2">
                      <span>{layerName}</span>
                      <span className="rounded bg-[#4C4FD6] text-white px-2 py-0.5 text-[9px]">
                        Tier {idx + 1}
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px] font-semibold text-[#292622]">
                      {items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#248A46] shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {idx < Object.keys(data.proposed_architecture).length - 1 && (
                    <div className="text-center font-bold text-xs text-[#4C4FD6]">↓ Decoupled Interface Contract</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Measurable Architecture Characteristics Grid */}
      <div className="rounded-[28px] border-2 border-[#D8CFC2] bg-[#FFFDFC] p-6 shadow-warm space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAE3D6] pb-3">
          <h3 className="text-base font-black text-[#181715] flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#C7953D]" />
            <span>Measurable Architecture Characteristics</span>
          </h3>
          <span className="text-xs font-semibold text-[#6B645A]">
            Empirical quality metrics
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE] p-4">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A] block">
              Coupling Index
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-[#181715] uppercase">
                {chars.coupling_level}
              </span>
              <span className="text-xs font-semibold text-[#6B645A]">
                ({chars.average_degree} avg deg)
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE] p-4">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A] block">
              Dependency Cycles
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-xl font-black ${chars.total_cycles > 0 ? 'text-[#C45F58]' : 'text-[#248A46]'}`}>
                {chars.total_cycles}
              </span>
              <span className="text-xs font-semibold text-[#6B645A]">
                circular loops
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE] p-4">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A] block">
              Layer Violations
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-xl font-black ${chars.layer_violations.length > 0 ? 'text-[#C7953D]' : 'text-[#248A46]'}`}>
                {chars.layer_violations.length}
              </span>
              <span className="text-xs font-semibold text-[#6B645A]">
                detected
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE] p-4">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A] block">
              Large Clusters
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-[#181715]">
                {chars.large_clusters.length}
              </span>
              <span className="text-xs font-semibold text-[#6B645A]">
                modules &gt;250 LOC
              </span>
            </div>
          </div>
        </div>

        {/* Highly Connected Hubs & Cycles Breakdown */}
        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE]/60 p-4 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A] block">
              Highly Connected Hub Modules
            </span>
            <div className="space-y-1 font-mono text-xs text-[#292622]">
              {chars.highly_connected_hubs.map((hub) => (
                <div key={hub} className="flex items-center gap-1.5 p-1.5 rounded bg-[#FFFDFC] border border-[#D8CFC2]">
                  <GitBranch className="h-3.5 w-3.5 text-[#4C4FD6]" />
                  <span className="truncate">{hub}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE]/60 p-4 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A] block">
              Detected Layer Violations & Risk Notes
            </span>
            {chars.layer_violations.length === 0 ? (
              <div className="p-3 text-xs font-semibold text-[#248A46] bg-[#E0EFEB] rounded-xl border border-[#BEE0D6]">
                ✓ Clean architectural layer boundaries. Zero layer violations detected.
              </div>
            ) : (
              <div className="space-y-1 font-mono text-[11px] text-[#8F3F3A]">
                {chars.layer_violations.map((vio, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-[#F6E5E2] border border-[#ECC7C3]">
                    {vio}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Itemized Proposed Architectural Changes & Migration Steps */}
      <div className="rounded-[28px] border-2 border-[#D8CFC2] bg-[#FFFDFC] p-6 shadow-warm space-y-5">
        <div className="border-b border-[#EAE3D6] pb-3">
          <h3 className="text-base font-black text-[#181715] flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-[#4C4FD6]" />
            <span>Proposed Architectural Changes & Migration Roadmap</span>
          </h3>
          <p className="mt-1 text-xs font-semibold text-[#6B645A]">
            Reviewable architectural refactoring steps with affected files, rationale, and risks.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Changes Cards List */}
          <div className="space-y-3 lg:col-span-1">
            {data.proposed_changes.map((change) => {
              const isSelected = selectedChange?.change_id === change.change_id;
              return (
                <button
                  key={change.change_id}
                  onClick={() => setSelectedChange(change)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-[#4C4FD6] bg-[#EAE9FB]/50 shadow-md ring-2 ring-[#4C4FD6]/20'
                      : 'border-[#D8CFC2] bg-[#F7F4EE]/60 hover:bg-[#FFFDFC]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="text-xs font-black text-[#181715] truncate flex-1">
                      {change.title}
                    </h4>
                    <RiskBadge level={change.risk_level} size="sm" />
                  </div>
                  <p className="text-[11px] font-semibold text-[#6B645A] line-clamp-2">
                    {change.reason}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Selected Change Migration Plan Details */}
          <div className="lg:col-span-2 rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE]/60 p-5 space-y-4">
            {selectedChange ? (
              <>
                <div className="border-b border-[#D8CFC2] pb-3 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-[#181715]">
                      {selectedChange.title}
                    </h4>
                    <p className="mt-1 text-xs font-semibold text-[#5C554D]">
                      {selectedChange.reason}
                    </p>
                  </div>
                  <RiskBadge level={selectedChange.risk_level} size="std" />
                </div>

                {/* Affected Files */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A] block">
                    Affected Source Files ({selectedChange.affected_files.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                    {selectedChange.affected_files.map((file) => (
                      <span key={file} className="rounded-lg bg-[#FFFDFC] border border-[#D8CFC2] px-2.5 py-1 text-[#292622] font-semibold">
                        {file}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Migration Steps */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A] block">
                    Step-by-Step Migration Actions
                  </span>
                  <div className="space-y-2">
                    {selectedChange.migration_steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs font-semibold text-[#181715] bg-[#FFFDFC] p-3 rounded-xl border border-[#D8CFC2]">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4C4FD6] text-[10px] font-extrabold text-white">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs font-semibold text-[#6B645A]">
                Select a proposed change to inspect affected files and migration steps.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureEvolutionTab;
