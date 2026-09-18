import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  Package,
  AlertTriangle,
  FileCode,
  Search,
  RefreshCw,
  GitBranch,
  Layers,
  ArrowUpRight,
  Info,
  Database,
} from 'lucide-react';
import {
  DependencyHealthItem,
  DependencyHealthResponse,
  UpdateImpactPreview,
} from '../types';
import RiskBadge from './common/RiskBadge';

interface Props {
  projectId?: string | null;
}

export const DependencyHealthTab: React.FC<Props> = ({ projectId }) => {
  const [data, setData] = useState<DependencyHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sub-view states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ecosystemFilter, setEcosystemFilter] = useState<'all' | 'python' | 'node'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [selectedPackage, setSelectedPackage] = useState<DependencyHealthItem | null>(null);

  const fetchHealth = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/dependency-health`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result: DependencyHealthResponse = await res.json();
      setData(result);
      if (result.packages.length > 0 && !selectedPackage) {
        setSelectedPackage(result.packages[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dependency health data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchHealth();
    } else {
      setData(null);
    }
  }, [projectId]);

  const filteredPackages = useMemo(() => {
    if (!data?.packages) return [];
    return data.packages.filter((pkg) => {
      const matchesSearch =
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.current_spec.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (ecosystemFilter === 'python') return pkg.ecosystem === 'python';
      if (ecosystemFilter === 'node') return pkg.ecosystem === 'node';

      return true;
    });
  }, [data?.packages, searchQuery, ecosystemFilter]);

  const selectedImpactPreview: UpdateImpactPreview | null = useMemo(() => {
    if (!selectedPackage || !data?.update_impact_previews) return null;
    return data.update_impact_previews[selectedPackage.name] || null;
  }, [selectedPackage, data?.update_impact_previews]);

  if (!projectId) {
    return (
      <div className="rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-10 text-center text-sm font-medium text-[#6B645A]">
        Ingest a codebase to evaluate external dependency health and vulnerability risks.
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
          onClick={fetchHealth}
          className="mt-4 btn-brand-pill px-4 py-2 text-xs inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Dependency Scan</span>
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* 1. Action Header */}
      <section className="flex flex-col gap-4 rounded-[28px] border-2 border-[#D8CFC2] bg-[#FFFDFC] p-5 md:flex-row md:items-center md:justify-between shadow-warm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#EAE9FB] text-[#4340A0] rounded-2xl border border-[#C7C4F7] shadow-xs">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#181715] sm:text-lg">
              Dependency Health & Vulnerability Scanner
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-[#6B645A]">
              Manifest analysis of package versions, unused declarations, deprecation risks, and update impacts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.manifests_found.map((manifest) => (
            <span
              key={manifest}
              className="rounded-full bg-[#EAE9FB] px-3 py-1 font-mono text-[10px] font-extrabold text-[#4340A0] border border-[#C7C4F7]"
            >
              📄 {manifest}
            </span>
          ))}
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="p-2 rounded-full border border-[#D8CFC2] bg-[#F7F4EE] hover:bg-[#181715] hover:text-white text-[#5C554D] transition-colors"
            title="Rescan manifests"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {/* 2. Dependency Health Metrics Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-5 sm:gap-4">
        <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B645A]">
            Packages
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Package className="h-5 w-5 text-[#4C4FD6]" />
            <span className="text-2xl font-black text-[#181715]">
              {data.total_packages}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-semibold text-[#8C8275]">
            Direct: {data.direct_packages_count}
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B645A]">
            Outdated
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#C7953D]" />
            <span className="text-2xl font-black text-[#C7953D]">
              {data.outdated_count}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-semibold text-[#8C8275]">
            Update candidates
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B645A]">
            Unused
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#8B8DF2]" />
            <span className="text-2xl font-black text-[#4340A0]">
              {data.unused_count}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-semibold text-[#8C8275]">
            Never imported in code
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B645A]">
            Deprecated
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#C45F58]" />
            <span className="text-2xl font-black text-[#C45F58]">
              {data.deprecated_count}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-semibold text-[#8C8275]">
            Legacy packages
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B645A]">
            Security Risk
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#C45F58]" />
            <span className="text-2xl font-black text-[#C45F58]">
              {data.risk_count}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-semibold text-[#8C8275]">
            Requires review
          </div>
        </div>
      </div>

      {/* 3. Toolbar Controls */}
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[#EAE3D6] pb-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#6B645A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dependencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F7F4EE] border border-[#D8CFC2] rounded-full pl-9 pr-4 py-1.5 text-xs text-[#292622] placeholder-[#6B645A] focus:outline-none focus:border-[#4C4FD6]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Ecosystem Filters */}
            <div className="flex items-center gap-1 border border-[#D8CFC2] bg-[#F7F4EE] rounded-full p-1 text-xs">
              {(['all', 'python', 'node'] as const).map((eco) => (
                <button
                  key={eco}
                  onClick={() => setEcosystemFilter(eco)}
                  className={`px-3 py-1 rounded-full uppercase text-[10px] font-extrabold transition-all ${
                    ecosystemFilter === eco
                      ? 'bg-[#181715] text-white shadow-xs'
                      : 'text-[#6B645A] hover:text-[#181715]'
                  }`}
                >
                  {eco}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center border border-[#D8CFC2] bg-[#F7F4EE] rounded-full p-1 text-xs">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold transition-all ${
                  viewMode === 'list'
                    ? 'bg-[#4C4FD6] text-white shadow-xs'
                    : 'text-[#6B645A] hover:text-[#181715]'
                }`}
              >
                <Database className="w-3 h-3" />
                <span>Package List</span>
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold transition-all ${
                  viewMode === 'tree'
                    ? 'bg-[#4C4FD6] text-white shadow-xs'
                    : 'text-[#6B645A] hover:text-[#181715]'
                }`}
              >
                <GitBranch className="w-3 h-3" />
                <span>Dependency Tree</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Main Workspace Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List / Tree View */}
          <div className="lg:col-span-2">
            {viewMode === 'list' ? (
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {filteredPackages.map((pkg) => {
                  const isSelected = selectedPackage?.name === pkg.name;
                  return (
                    <div
                      key={`${pkg.manifest_source}-${pkg.name}`}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#4C4FD6] bg-[#FFFDFC] shadow-md ring-2 ring-[#4C4FD6]/20'
                          : 'border-[#D8CFC2] bg-[#F7F4EE]/60 hover:bg-[#FFFDFC] hover:border-[#181715]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-[#181715]">
                            {pkg.name}
                          </span>
                          <span className="rounded-md bg-[#EAE9FB] px-2 py-0.5 font-mono text-[9px] font-extrabold uppercase text-[#4340A0]">
                            {pkg.ecosystem}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {pkg.is_deprecated && (
                            <span className="rounded-full bg-[#F6E5E2] px-2 py-0.5 text-[9px] font-extrabold text-[#8F3F3A] border border-[#ECC7C3]">
                              Deprecated
                            </span>
                          )}
                          {pkg.is_unused && (
                            <span className="rounded-full bg-[#F3E8FF] px-2 py-0.5 text-[9px] font-extrabold text-[#6B21A8] border border-[#E9D5FF]">
                              Unused
                            </span>
                          )}
                          {pkg.is_outdated && (
                            <span className="rounded-full bg-[#FEF3E2] px-2 py-0.5 text-[9px] font-extrabold text-[#92400E] border border-[#E6D3A9]">
                              Outdated
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-semibold text-[#6B645A] font-mono">
                        <div>
                          <span>Spec: {pkg.current_spec}</span>
                          <span className="mx-2 text-[#C8BEB0]">•</span>
                          <span className="text-[#248A46]">Latest: {pkg.latest_version}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-[#4C4FD6]">
                          <FileCode className="w-3.5 h-3.5" />
                          <span>Used by {pkg.used_by_count} modules</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Tree View Mode */
              <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE]/50 p-5 min-h-[400px] max-h-[580px] overflow-y-auto space-y-3 font-mono text-xs text-[#292622]">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B645A] border-b border-[#D8CFC2] pb-2">
                  Manifest Dependency Hierarchy
                </h3>
                {data.dependency_tree.length === 0 ? (
                  <div className="py-12 text-center text-[#8C8275]">
                    Direct manifest tree generated. All packages listed in direct mode.
                  </div>
                ) : (
                  data.dependency_tree.map((node) => (
                    <div key={node.name} className="space-y-1">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-[#FFFDFC] border border-[#D8CFC2]">
                        <GitBranch className="w-4 h-4 text-[#4C4FD6]" />
                        <span className="font-bold">{node.name}</span>
                        <span className="text-[10px] text-[#6B645A]">({node.version})</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Selected Package Detail & Update Impact Preview */}
          <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-5 shadow-xs flex flex-col justify-between min-h-[440px]">
            {selectedPackage ? (
              <div className="space-y-5">
                <div className="border-b border-[#D8CFC2] pb-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase font-black text-[#4C4FD6]">
                      {selectedPackage.manifest_source}
                    </span>
                    {selectedImpactPreview && (
                      <RiskBadge level={selectedImpactPreview.risk_level} size="sm" />
                    )}
                  </div>
                  <h3 className="font-mono text-base font-black text-[#181715] break-all">
                    {selectedPackage.name}
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs text-[#4D4842]">
                  <div className="flex justify-between border-b border-[#D8CFC2]/60 pb-1.5">
                    <span className="text-[#6B645A]">Current Spec:</span>
                    <span className="font-mono font-bold">{selectedPackage.current_spec}</span>
                  </div>

                  <div className="flex justify-between border-b border-[#D8CFC2]/60 pb-1.5">
                    <span className="text-[#6B645A]">Target Version:</span>
                    <span className="font-mono font-bold text-[#248A46]">{selectedPackage.latest_version}</span>
                  </div>

                  <div className="flex justify-between border-b border-[#D8CFC2]/60 pb-1.5">
                    <span className="text-[#6B645A]">Ecosystem:</span>
                    <span className="font-bold capitalize">{selectedPackage.ecosystem}</span>
                  </div>

                  <div className="flex justify-between border-b border-[#D8CFC2]/60 pb-1.5">
                    <span className="text-[#6B645A]">Import Usage:</span>
                    <span className="font-bold text-[#4C4FD6]">{selectedPackage.used_by_count} modules</span>
                  </div>
                </div>

                {/* Update Impact Preview Card */}
                {selectedImpactPreview && (
                  <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE] p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-[#181715]">
                      <ArrowUpRight className="h-4 w-4 text-[#4C4FD6]" />
                      <span>Update Impact Preview</span>
                    </div>

                    <p className="text-[11px] font-semibold text-[#5C554D]">
                      Upgrading from <code className="font-mono font-bold">{selectedPackage.current_spec}</code> to{' '}
                      <code className="font-mono font-bold text-[#248A46]">{selectedPackage.latest_version}</code>:
                    </p>

                    {selectedImpactPreview.recommendations.length > 0 && (
                      <div className="space-y-1 text-[11px] font-semibold text-[#76561B] bg-[#FEF3E2] p-2.5 rounded-xl border border-[#E6D3A9]">
                        {selectedImpactPreview.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span>•</span>
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedPackage.used_by_modules.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A] block">
                          Source Files Importing Package ({selectedPackage.used_by_modules.length})
                        </span>
                        <div className="max-h-28 overflow-y-auto font-mono text-[11px] text-[#292622] space-y-1">
                          {selectedPackage.used_by_modules.map((mod) => (
                            <div key={mod} className="flex items-center gap-1.5 p-1 rounded bg-[#FFFDFC] border border-[#D8CFC2]">
                              <FileCode className="h-3 w-3 text-[#4C4FD6]" />
                              <span className="truncate">{mod}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-14 text-[#948C81] text-xs space-y-2">
                <Info className="w-6 h-6 mx-auto opacity-60" />
                <p>Select a package to view health breakdown and update impact preview.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DependencyHealthTab;
