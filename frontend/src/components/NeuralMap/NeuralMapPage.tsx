import { useEffect, useMemo, useState } from 'react';
import {
  Network,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { GraphResponse, HotspotItem, TabType } from '../../types';
import {
  buildNeuralGraphData,
  type ClusterMode,
  type FocusDepth,
  type VisualMode,
} from './graphDataAdapter';
import ForceGraphCanvas from './ForceGraphCanvas';
import NeuralMapControls from './NeuralMapControls';
import NeuralMapLegend from './NeuralMapLegend';
import SelectedNodePanel from './SelectedNodePanel';
import StatTile from '../common/StatTile';
import { formatNumber } from '../../utils/formatters';

interface NeuralMapPageProps {
  projectId: string;
  targetFile: string | null;
  onNavigate: (tab: TabType, file: string) => void;
}

export default function NeuralMapPage({
  projectId,
  targetFile,
  onNavigate,
}: NeuralMapPageProps) {
  const [data, setData] = useState<{
    graph: GraphResponse;
    hotspots: HotspotItem[];
    warning: boolean;
  } | null>(null);

  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [reset, setReset] = useState(0);

  // Advanced Visual States
  const [visualMode, setVisualMode] = useState<VisualMode>('structure');
  const [focusDepth, setFocusDepth] = useState<FocusDepth>('1-hop');
  const [clusterMode, setClusterMode] = useState<ClusterMode>('none');
  const [quickFilter, setQuickFilter] = useState<'all' | 'high_risk' | 'partial' | 'entry_points' | 'unresolved'>('all');
  const [showIsolated, setShowIsolated] = useState(true);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [impactPreviewNode, setImpactPreviewNode] = useState<string | null>(null);

  // Fetch canonical graph & hotspots in parallel
  useEffect(() => {
    const abort = new AbortController();
    setData(null);
    setError('');
    setSelected(null);

    const fetchJson = async (path: string) => {
      const response = await fetch(`/api/projects/${projectId}/${path}`, {
        signal: abort.signal,
      });
      if (!response.ok) throw new Error(`Unable to load Neural Map data (${response.status})`);
      return response.json();
    };

    Promise.all([
      fetchJson('graph?level=module'),
      fetchJson('hotspots').catch(() => null),
    ])
      .then(([graph, hotspots]) => {
        if (!abort.signal.aborted) {
          setData({
            graph,
            hotspots: hotspots?.hotspots || [],
            warning: !hotspots,
          });
        }
      })
      .catch(e => {
        if (!abort.signal.aborted) setError(e.message);
      });

    return () => abort.abort();
  }, [projectId, retry]);

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 100);
    return () => clearTimeout(timer);
  }, [search]);

  // Build neural graph data from canonical sources
  const graph = useMemo(() => {
    return data
      ? buildNeuralGraphData(data.graph, data.hotspots)
      : {
          nodes: [],
          links: [],
          clusters: [],
          summary: {
            totalModules: 0,
            resolvedEdges: 0,
            unresolvedImports: 0,
            cycleCount: 0,
            confirmedEntryPoints: 0,
            trueStandaloneCount: 0,
            graphConfidence: 'high' as const,
            fullAstPercentage: 100,
          },
        };
  }, [data]);

  // Filter nodes if activeCluster is selected
  const clusterFilteredGraph = useMemo(() => {
    if (!activeCluster) return graph;
    const filteredNodes = graph.nodes.filter(n => n.clusterLabel === activeCluster);
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graph.links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));
    return {
      ...graph,
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [graph, activeCluster]);

  // Sync targetFile with selection
  useEffect(() => {
    if (targetFile && graph.nodes.length > 0) {
      const match = graph.nodes.find(
        n =>
          n.id === targetFile ||
          n.label === targetFile ||
          n.label.replace(/\\/g, '/').endsWith(targetFile.replace(/\\/g, '/'))
      );
      if (match) setSelected(match.id);
    }
  }, [graph, targetFile]);

  const selectedNode = graph.nodes.find(n => n.id === selected) || null;

  if (error) {
    return (
      <div role="alert" className="p-6 bg-surface border border-line rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-red font-bold">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button
          className="px-3 py-1.5 rounded-md bg-indigo text-white text-xs font-semibold hover:bg-indigo/90"
          onClick={() => setRetry(v => v + 1)}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div role="status" className="p-8 bg-surface border border-line rounded-xl text-center space-y-2">
        <Sparkles className="w-6 h-6 text-indigo animate-spin mx-auto" />
        <p className="text-sm font-medium text-ink">Assembling Neural Architecture Map…</p>
        <p className="text-xs text-ink-3">Synchronizing canonical dependency graph and risk assessments</p>
      </div>
    );
  }

  const { summary } = graph;
  const isConfidencePartial =
    summary.graphConfidence === 'partial' ||
    summary.graphConfidence === 'low' ||
    summary.unresolvedImports > 0;

  return (
    <section
      role="tabpanel"
      id="tabpanel-neural-map"
      aria-labelledby="tab-neural-map"
      className="space-y-4 animate-[fade-up_200ms_ease-out]"
    >
      {/* 1. Header & Confidence Banner */}
      <div className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display font-bold text-xl text-ink leading-tight">
                  Neural Map
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill font-mono text-[10px] font-bold tracking-wider uppercase border ${
                    summary.graphConfidence === 'high'
                      ? 'bg-teal-surface text-teal-text border-teal-line'
                      : summary.graphConfidence === 'medium'
                      ? 'bg-amber-surface text-amber-text border-amber-line'
                      : 'bg-amber-surface text-amber-text border-amber-line'
                  }`}
                  title={summary.graphConfidenceReason || 'Confidence level of AST parsing and edge resolution'}
                >
                  GRAPH CONFIDENCE: {summary.graphConfidence.toUpperCase()}
                </span>
                <span className="font-mono text-[10px] text-ink-3 px-2 py-0.5 rounded bg-tile border border-line">
                  {summary.fullAstPercentage}% Full AST Coverage
                </span>
              </div>
              <p className="font-sans text-xs text-ink-3 mt-1">
                High-tech architecture intelligence visualizer. Shape = Role · Size = Importance · Halo = Risk · Border = Parse Quality.
              </p>
            </div>
          </div>
        </div>

        {/* 6 Canonical Stat Tiles (matching Dependency Map Page 4) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile
            label="MODULES"
            value={formatNumber(summary.totalModules)}
            color="ink"
          />
          <StatTile
            label="RESOLVED EDGES"
            value={formatNumber(summary.resolvedEdges)}
            color="ink"
          />
          <StatTile
            label="UNRESOLVED IMPORTS"
            value={formatNumber(summary.unresolvedImports)}
            color={summary.unresolvedImports > 0 ? 'amber' : 'ink'}
          />
          <StatTile
            label="DETECTED CYCLES"
            value={formatNumber(summary.cycleCount)}
            color={summary.cycleCount > 0 ? 'red' : 'ink'}
          />
          <StatTile
            label="CONFIRMED ENTRY POINTS"
            value={formatNumber(summary.confirmedEntryPoints)}
            color="teal"
          />
          <StatTile
            label="TRUE STANDALONE"
            value={formatNumber(summary.trueStandaloneCount)}
            color="ink"
          />
        </div>

        {/* Incomplete Analysis & Cycle Confidence Notice */}
        <div className="pt-3 border-t border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-ink-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-ink-2">Cycle Semantics:</span>
            {summary.cycleCount === 0 ? (
              <span
                className="inline-flex items-center gap-1 text-teal-strong font-medium"
                title={
                  summary.unresolvedImports > 0
                    ? `Cycle detection may be incomplete because ${summary.unresolvedImports} local imports remain unresolved.`
                    : 'All internal relationships resolved with zero circular references.'
                }
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
                {summary.unresolvedImports === 0
                  ? 'Clean hierarchical DAG'
                  : '0 cycles detected in resolved graph'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-red" />
                {summary.cycleCount} dependency cycle(s) detected
              </span>
            )}
            {summary.cycleWarning && (
              <span className="text-amber-text font-medium ml-1">
                {summary.cycleWarning}
              </span>
            )}
          </div>

          {isConfidencePartial && (
            <div className="flex items-center gap-2 text-amber-text font-medium flex-wrap">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>Isolated nodes may represent unresolved imports rather than truly standalone modules.</span>
              </span>
              <button
                type="button"
                onClick={() => onNavigate('graph', targetFile || '')}
                className="inline-flex items-center gap-0.5 underline font-bold hover:text-amber-strong text-[11px]"
              >
                Inspect in Dependency Map <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Neural Map Canvas & Controls */}
      {!graph.nodes.length ? (
        <p className="p-8 bg-surface rounded-xl border border-line text-center text-ink-3 text-sm">
          No analyzed source files are available for this project.
        </p>
      ) : (
        <div
          className={`grid gap-4 items-start ${
            selectedNode ? 'lg:grid-cols-[1fr_340px]' : 'grid-cols-1'
          }`}
        >
          {/* Canvas Wrapper */}
          <div className="min-w-0 rounded-xl bg-[#08080C] border border-line p-3 sm:p-4 space-y-3">
            <NeuralMapControls
              search={search}
              onSearch={setSearch}
              language={language}
              onLanguage={setLanguage}
              nodes={graph.nodes}
              clusters={graph.clusters}
              selected={selected}
              onSelect={setSelected}
              onReset={() => {
                setSearch('');
                setQuery('');
                setLanguage('all');
                setSelected(null);
                setVisualMode('structure');
                setFocusDepth('1-hop');
                setClusterMode('none');
                setQuickFilter('all');
                setShowIsolated(true);
                setActiveCluster(null);
                setImpactPreviewNode(null);
                setReset(v => v + 1);
              }}
              visualMode={visualMode}
              onVisualMode={setVisualMode}
              focusDepth={focusDepth}
              onFocusDepth={setFocusDepth}
              clusterMode={clusterMode}
              onClusterMode={setClusterMode}
              quickFilter={quickFilter}
              onQuickFilter={setQuickFilter}
              showIsolated={showIsolated}
              onToggleIsolated={() => setShowIsolated(v => !v)}
              activeCluster={activeCluster}
              onSelectCluster={setActiveCluster}
            />

            <div className="relative">
              <ForceGraphCanvas
                graph={clusterFilteredGraph}
                search={query}
                language={language}
                selected={selected}
                onSelect={setSelected}
                reset={reset}
                visualMode={visualMode}
                focusDepth={focusDepth}
                clusterMode={clusterMode}
                quickFilter={quickFilter}
                showIsolated={showIsolated}
                impactPreviewNode={impactPreviewNode}
              />
              <NeuralMapLegend />
            </div>

            <div className="flex items-center justify-between px-3 text-xs text-white/60">
              <span>
                {
                  clusterFilteredGraph.nodes.filter(
                    n =>
                      (!query || n.label.toLowerCase().includes(query.toLowerCase())) &&
                      (language === 'all' || n.language === language) &&
                      (showIsolated || n.fanIn > 0 || n.fanOut > 0)
                  ).length
                }{' '}
                matching module(s) {activeCluster ? `in ${activeCluster}` : ''} · Select a node to inspect technical evidence
              </span>
              <span className="font-mono text-[11px] hidden sm:inline text-white/40">
                Mode: {visualMode.toUpperCase()} · Focus: {focusDepth.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Selected Node Sidebar (Docked alongside on desktop, stacked on mobile) */}
          {selectedNode && (
            <SelectedNodePanel
              node={selectedNode}
              allNodes={graph.nodes}
              onClose={() => {
                setSelected(null);
                setImpactPreviewNode(null);
              }}
              onSelectNode={setSelected}
              onNavigate={onNavigate}
              isPreviewingImpact={impactPreviewNode === selectedNode.id}
              onToggleImpactPreview={() =>
                setImpactPreviewNode(impactPreviewNode === selectedNode.id ? null : selectedNode.id)
              }
            />
          )}
        </div>
      )}
    </section>
  );
}
