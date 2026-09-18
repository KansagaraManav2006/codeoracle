import React, { useEffect, useState } from 'react';
import {
  Network,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Info,
  ShieldCheck,
  Boxes,
  ArrowRight,
} from 'lucide-react';
import {
  KnowledgeGraphResponse,
  KnowledgeGraphNode,
} from '../types';

interface Props {
  projectId?: string | null;
}

export const KnowledgeGraphTab: React.FC<Props> = ({ projectId }) => {
  const [data, setData] = useState<KnowledgeGraphResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [selectedRelation, setSelectedRelation] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'nodes' | 'edges' | 'matrix' | 'validation'>('nodes');
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);

  const fetchKnowledgeGraph = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/knowledge-graph`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result: KnowledgeGraphResponse = await res.json();
      setData(result);
      if (result.nodes.length > 0 && !selectedNode) {
        setSelectedNode(result.nodes[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to construct Codebase Knowledge Graph.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchKnowledgeGraph();
    } else {
      setData(null);
    }
  }, [projectId]);

  const handleExportJSON = () => {
    if (!data) return;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge_graph_${projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-slate-900/50 rounded-xl border border-slate-800">
        <Network className="w-12 h-12 text-slate-500 mb-3 animate-pulse" />
        <h3 className="text-lg font-medium text-slate-300">No Project Selected</h3>
        <p className="text-sm text-slate-500 max-w-md mt-1">
          Select or ingest a project workspace to generate its Codebase Knowledge Graph.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-slate-900/50 rounded-xl border border-slate-800">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <h3 className="text-lg font-medium text-slate-200">Building Codebase Knowledge Graph...</h3>
        <p className="text-sm text-slate-400 mt-1">
          Traversing AST entities, dependencies, APIs, DB interactions, and establishing relationship mappings.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-rose-950/30 rounded-xl border border-rose-900/50">
        <AlertTriangle className="w-10 h-10 text-rose-500 mb-3" />
        <h3 className="text-lg font-medium text-rose-300">Knowledge Graph Error</h3>
        <p className="text-sm text-rose-400/80 max-w-md mt-1">{error}</p>
        <button
          onClick={fetchKnowledgeGraph}
          className="mt-4 px-4 py-2 bg-rose-900/50 hover:bg-rose-900 text-rose-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Analysis
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Filtered Nodes & Edges
  const filteredNodes = data.nodes.filter((node) => {
    const matchesSearch =
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.kind.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKind = selectedKind === 'all' || node.kind === selectedKind;
    return matchesSearch && matchesKind;
  });

  const filteredEdges = data.edges.filter((edge) => {
    const matchesRelation = selectedRelation === 'all' || edge.relation === selectedRelation;
    const matchesSearch =
      edge.source_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edge.target_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edge.relation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRelation && matchesSearch;
  });

  // Helpers
  const getNodeLabel = (nodeId: string) => {
    const found = data.nodes.find((n) => n.id === nodeId);
    return found ? found.label : nodeId;
  };

  const getKindBadgeColor = (kind: string) => {
    switch (kind) {
      case 'project':
        return 'bg-purple-900/40 text-purple-300 border-purple-800';
      case 'module':
      case 'file':
        return 'bg-sky-900/40 text-sky-300 border-sky-800';
      case 'class':
        return 'bg-amber-900/40 text-amber-300 border-amber-800';
      case 'function':
      case 'method':
        return 'bg-emerald-900/40 text-emerald-300 border-emerald-800';
      case 'api':
        return 'bg-indigo-900/40 text-indigo-300 border-indigo-800';
      case 'test':
        return 'bg-teal-900/40 text-teal-300 border-teal-800';
      case 'dependency':
        return 'bg-rose-900/40 text-rose-300 border-rose-800';
      case 'database_interaction':
        return 'bg-cyan-900/40 text-cyan-300 border-cyan-800';
      case 'configuration_file':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getRelationBadgeColor = (relation: string) => {
    switch (relation) {
      case 'IMPORTS':
      case 'IMPORTED_BY':
        return 'bg-sky-950 text-sky-400 border-sky-800/60';
      case 'CALLS':
      case 'CALLED_BY':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800/60';
      case 'EXTENDS':
      case 'IMPLEMENTS':
        return 'bg-amber-950 text-amber-400 border-amber-800/60';
      case 'DEPENDS_ON':
        return 'bg-rose-950 text-rose-400 border-rose-800/60';
      case 'TESTS':
        return 'bg-teal-950 text-teal-400 border-teal-800/60';
      case 'EXPOSES':
        return 'bg-indigo-950 text-indigo-400 border-indigo-800/60';
      case 'READS':
      case 'WRITES':
        return 'bg-cyan-950 text-cyan-400 border-cyan-800/60';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/80 rounded-xl border border-slate-800 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Codebase Knowledge Graph</h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              v{data.schema_version} Read-Only Layer
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Internal normalized graph representation powering dependency resolution, impact analysis, target architecture evolution, and code health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchKnowledgeGraph}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-index Graph
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/10"
          >
            <Download className="w-3.5 h-3.5" /> Export Graph (JSON)
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Entities (Nodes)</span>
            <Boxes className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-100">{data.summary.total_nodes}</span>
            <span className="text-xs text-slate-500 block mt-0.5">Across {Object.keys(data.summary.node_kind_counts).length} categories</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Relationships (Edges)</span>
            <Network className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-100">{data.summary.total_edges}</span>
            <span className="text-xs text-slate-500 block mt-0.5">{Object.keys(data.summary.relation_counts).length} relationship types</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Validation Health</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-100 capitalize">{data.summary.validation.status}</span>
              {data.summary.validation.status === 'valid' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <span className="text-xs text-slate-500 block mt-0.5">
              {data.summary.validation.total_checks_passed} checks passed
            </span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Edge Deduplication</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-100">{data.summary.validation.duplicate_edges_removed}</span>
            <span className="text-xs text-slate-500 block mt-0.5">Duplicate edges prevented</span>
          </div>
        </div>
      </div>

      {/* Sub Navigation & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('nodes')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeSubTab === 'nodes' ? 'bg-slate-800 text-amber-400 font-bold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Entities ({filteredNodes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('edges')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeSubTab === 'edges' ? 'bg-slate-800 text-amber-400 font-bold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Relationships ({filteredEdges.length})
          </button>
          <button
            onClick={() => setActiveSubTab('matrix')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeSubTab === 'matrix' ? 'bg-slate-800 text-amber-400 font-bold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Category Matrix
          </button>
          <button
            onClick={() => setActiveSubTab('validation')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeSubTab === 'validation' ? 'bg-slate-800 text-amber-400 font-bold border border-slate-700' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Validation & Health
            {data.summary.validation.warnings.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search entities, IDs, relations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Kind Filter */}
          {activeSubTab === 'nodes' && (
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Entity Kinds</option>
              {Object.keys(data.summary.node_kind_counts).map((kind) => (
                <option key={kind} value={kind}>
                  {kind} ({data.summary.node_kind_counts[kind]})
                </option>
              ))}
            </select>
          )}

          {/* Relation Filter */}
          {activeSubTab === 'edges' && (
            <select
              value={selectedRelation}
              onChange={(e) => setSelectedRelation(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Relationship Types</option>
              {Object.keys(data.summary.relation_counts).map((rel) => (
                <option key={rel} value={rel}>
                  {rel} ({data.summary.relation_counts[rel]})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Tab Views */}
      {activeSubTab === 'nodes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Node List */}
          <div className="lg:col-span-2 space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredNodes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800 text-xs">
                No codebase entities match search query or category filter.
              </div>
            ) : (
              filteredNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedNode?.id === node.id
                      ? 'bg-slate-850 border-amber-500/50 shadow-md shadow-amber-500/5'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-sm font-semibold text-slate-200 truncate">{node.label}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${getKindBadgeColor(node.kind)}`}>
                      {node.kind}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span>ID: {node.id}</span>
                    {node.properties.language && <span>Lang: {node.properties.language}</span>}
                    {node.properties.line_count && <span>LOC: {node.properties.line_count}</span>}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Node Details Sidebar */}
          <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Info className="w-4 h-4 text-amber-400" /> Entity Metadata & Mappings
            </h3>

            {selectedNode ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px] block">Label</span>
                  <p className="font-mono text-sm text-slate-200 font-bold mt-0.5 break-all">{selectedNode.label}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px] block">Entity Kind</span>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded border ${getKindBadgeColor(selectedNode.kind)}`}>
                      {selectedNode.kind}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px] block">Node ID</span>
                    <p className="font-mono text-slate-300 mt-1 truncate">{selectedNode.id}</p>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px] block mb-1">Properties</span>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-slate-300 text-[11px] space-y-1 overflow-x-auto">
                    {Object.keys(selectedNode.properties).length === 0 ? (
                      <span className="text-slate-600">No extra properties</span>
                    ) : (
                      Object.entries(selectedNode.properties).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-slate-500">{k}:</span>
                          <span className="text-amber-300 font-medium truncate">{String(v)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Direct Relationships */}
                <div>
                  <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px] block mb-1">
                    Outgoing Mappings ({data.edges.filter((e) => e.source_id === selectedNode.id).length})
                  </span>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {data.edges
                      .filter((e) => e.source_id === selectedNode.id)
                      .map((edge) => (
                        <div key={edge.id} className="p-2 bg-slate-950 rounded border border-slate-800 flex items-center justify-between text-[11px]">
                          <span className={`px-1.5 py-0.2 font-bold text-[9px] rounded border ${getRelationBadgeColor(edge.relation)}`}>
                            {edge.relation}
                          </span>
                          <span className="font-mono text-slate-400 truncate max-w-[150px]">{getNodeLabel(edge.target_id)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Select an entity node from the left list to view detailed properties.</p>
            )}
          </div>
        </div>
      )}

      {/* Relationships Table View */}
      {activeSubTab === 'edges' && (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Source Entity</th>
                  <th className="px-4 py-3 font-semibold text-center">Directed Relation</th>
                  <th className="px-4 py-3 font-semibold">Target Entity</th>
                  <th className="px-4 py-3 font-semibold text-right">Edge ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {filteredEdges.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-sans">
                      No relationship edges match current filters.
                    </td>
                  </tr>
                ) : (
                  filteredEdges.map((edge) => (
                    <tr key={edge.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-sky-400 font-semibold max-w-xs truncate">{getNodeLabel(edge.source_id)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded border ${getRelationBadgeColor(edge.relation)}`}>
                          {edge.relation} <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-semibold max-w-xs truncate">{getNodeLabel(edge.target_id)}</td>
                      <td className="px-4 py-3 text-right text-slate-500 text-[10px]">{edge.id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Matrix Breakdown */}
      {activeSubTab === 'matrix' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-sky-400" /> Entity Kind Distribution
            </h3>
            <div className="space-y-2">
              {Object.entries(data.summary.node_kind_counts).map(([kind, count]) => {
                const pct = Math.round((count / data.summary.total_nodes) * 100);
                return (
                  <div key={kind} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 capitalize">{kind.replace('_', ' ')}</span>
                      <span className="text-slate-400">{count} nodes ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" /> Relationship Type Distribution
            </h3>
            <div className="space-y-2">
              {Object.entries(data.summary.relation_counts).map(([rel, count]) => {
                const pct = Math.round((count / data.summary.total_edges) * 100);
                return (
                  <div key={rel} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">{rel}</span>
                      <span className="text-slate-400">{count} edges ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Validation Health Tab */}
      {activeSubTab === 'validation' && (
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-200">Knowledge Graph Validation & Health Audit</h3>
              <p className="text-xs text-slate-400">Automatic schema integrity checks for non-duplication and orphan prevention.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-500 block">Status</span>
              <span className="text-emerald-400 font-bold uppercase">{data.summary.validation.status}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-500 block">Duplicate Edges Pruned</span>
              <span className="text-amber-400 font-bold">{data.summary.validation.duplicate_edges_removed}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-500 block">Orphan Edges Prevented</span>
              <span className="text-teal-400 font-bold">{data.summary.validation.orphaned_edges_prevented}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300">Validation Checks & Diagnostic Log</h4>
            {data.summary.validation.warnings.length === 0 ? (
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                All graph validation integrity assertions passed cleanly with 0 corruption or duplicate references detected.
              </div>
            ) : (
              data.summary.validation.warnings.map((warn, i) => (
                <div key={i} className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  {warn}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 flex items-center gap-2 text-slate-400 text-xs">
        <Info className="w-4 h-4 text-slate-500 shrink-0" />
        <span>{data.disclaimer}</span>
      </div>
    </div>
  );
};
