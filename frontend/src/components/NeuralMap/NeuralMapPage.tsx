import { useEffect, useMemo, useState } from 'react';
import { Network } from 'lucide-react';
import type { GraphResponse, HotspotItem, TabType } from '../../types';
import { buildNeuralGraphData } from './graphDataAdapter';
import ForceGraphCanvas from './ForceGraphCanvas';
import NeuralMapControls from './NeuralMapControls';
import NeuralMapLegend from './NeuralMapLegend';
import SelectedNodePanel from './SelectedNodePanel';

export default function NeuralMapPage({ projectId, targetFile, onNavigate }: {
  projectId: string; targetFile: string | null; onNavigate: (tab: TabType, file: string) => void;
}) {
  const [data, setData] = useState<{ graph: GraphResponse; hotspots: HotspotItem[]; warning: boolean } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [reset, setReset] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setData(null); setError(''); setSelected(null);
    const fetchJson = async (path: string) => {
      const response = await fetch(`/api/projects/${projectId}/${path}`, { signal: abort.signal });
      if (!response.ok) throw new Error(`Unable to load Neural Map (${response.status})`);
      return response.json();
    };
    Promise.all([fetchJson('graph?level=module'), fetchJson('hotspots').catch(() => null)])
      .then(([graph, hotspots]) => { if (!abort.signal.aborted) setData({ graph, hotspots: hotspots?.hotspots || [], warning: !hotspots }); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [projectId, retry]);
  useEffect(() => { const timer = setTimeout(() => setQuery(search), 100); return () => clearTimeout(timer); }, [search]);
  const graph = useMemo(() => data ? buildNeuralGraphData(data.graph, data.hotspots) : { nodes: [], links: [] }, [data]);
  useEffect(() => { setSelected(graph.nodes.find(n => n.id === targetFile || n.label === targetFile)?.id || null); }, [graph, targetFile]);
  const node = graph.nodes.find(n => n.id === selected);
  if (error) return <div role="alert" className="p-6 bg-surface border border-line rounded-lg">{error} <button className="underline ml-3" onClick={() => setRetry(v => v + 1)}>Retry</button></div>;
  if (!data) return <p role="status" className="p-6">Loading Neural Map…</p>;
  return <section role="tabpanel" id="tabpanel-neural-map" aria-labelledby="tab-neural-map" className="space-y-4">
    <div className="flex items-center gap-3"><Network className="w-5 h-5 text-indigo" /><h2 className="font-display font-bold text-xl text-ink">Neural Map</h2>
      <span className="text-xs text-ink-3">{graph.nodes.length} files · {graph.links.length} dependencies</span></div>
    {data.warning && <p role="status" className="text-xs text-amber-text">Hotspot scores unavailable. Showing graph complexity and cycle risk.</p>}
    {data.graph.summary.truncated_edges_count > 0 && <p className="text-xs text-ink-3">The API omitted {data.graph.summary.truncated_edges_count} edges from this graph.</p>}
    {!graph.nodes.length ? <p className="p-8 bg-surface rounded-lg">No analyzed source files are available for this project.</p> : <div className={`grid gap-4 items-start ${node ? 'lg:grid-cols-[1fr_310px]' : ''}`}>
      <div className="min-w-0 rounded-xl bg-[#0A0A0F] border border-line p-3">
        <NeuralMapControls search={search} onSearch={setSearch} language={language} onLanguage={setLanguage} nodes={graph.nodes} selected={selected} onSelect={setSelected}
          onReset={() => { setSearch(''); setQuery(''); setLanguage('all'); setSelected(null); setReset(v => v + 1); }} />
        <div className="relative"><ForceGraphCanvas graph={graph} search={query} language={language} selected={selected} onSelect={setSelected} reset={reset} /><NeuralMapLegend /></div>
        <p className="text-xs text-white/60 px-3 pb-2" role="status">{graph.nodes.filter(n => (!query || n.label.toLowerCase().includes(query.toLowerCase())) && (language === 'all' || n.language === language)).length} matching files · Select a node to inspect its direct connections</p>
      </div>
      {node && <SelectedNodePanel node={node} onClose={() => setSelected(null)} onNavigate={onNavigate} />}
    </div>}
  </section>;
}
