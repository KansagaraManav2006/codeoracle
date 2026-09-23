import { useMemo, useState } from 'react';
import { GitFork, ArrowRight, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { findShortestPath, type NeuralLink, type NeuralNode } from './graphDataAdapter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nodes: NeuralNode[];
  links: NeuralLink[];
  initialSourceId?: string | null;
  onApplyPath: (pathIds: string[] | null) => void;
}

export default function PathTracingModal({
  isOpen,
  onClose,
  nodes,
  links,
  initialSourceId,
  onApplyPath,
}: Props) {
  const [sourceId, setSourceId] = useState(initialSourceId || (nodes[0]?.id ?? ''));
  const [targetId, setTargetId] = useState(nodes[1]?.id ?? '');

  // Keep source in sync if opened with a selected node
  useMemo(() => {
    if (initialSourceId) setSourceId(initialSourceId);
  }, [initialSourceId]);

  const pathResult = useMemo(() => {
    if (!sourceId || !targetId) return null;
    return findShortestPath(links, sourceId, targetId);
  }, [links, sourceId, targetId]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  if (!isOpen) return null;

  const handleTrace = () => {
    if (pathResult) {
      onApplyPath(pathResult);
      onClose();
    }
  };

  const handleClear = () => {
    onApplyPath(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Path Tracing"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_150ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0A1627] border border-cyan-500/40 rounded-2xl shadow-2xl p-5 text-white flex flex-col space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Dependency Path Tracer</h3>
              <p className="text-[11px] text-white/50">
                Find the shortest resolved execution / import path between two modules
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source & Target Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono uppercase text-white/60 font-bold mb-1">
              Source Module
            </label>
            <select
              value={sourceId}
              onChange={e => setSourceId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id} className="bg-slate-900 text-white">
                  {n.label} ({n.clusterLabel})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-white/60 font-bold mb-1">
              Target Module
            </label>
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id} className="bg-slate-900 text-white">
                  {n.label} ({n.clusterLabel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Path Result Preview */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-white/60">
            <span className="font-semibold uppercase tracking-wider font-mono">Resolved Path</span>
            {pathResult ? (
              <span className="text-emerald-400 font-mono flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {pathResult.length - 1} hops (Shortest)
              </span>
            ) : (
              <span className="text-amber-400 font-mono flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                No direct or indirect path found
              </span>
            )}
          </div>

          {pathResult && (
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {pathResult.map((id, idx) => {
                const n = nodeMap.get(id);
                return (
                  <div key={id} className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-mono text-white/90 truncate flex-1">
                      {n?.label || id}
                    </span>
                    <span className="text-[10px] font-mono text-white/50 px-1.5 py-0.5 rounded bg-white/5">
                      {n?.clusterLabel || 'CORE'}
                    </span>
                    {idx < pathResult.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400/60 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            Clear Path Isolation
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!pathResult}
              onClick={handleTrace}
              className="px-4 py-1.5 rounded-lg text-xs bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none text-black font-bold transition-colors shadow-sm"
            >
              Isolate Path on Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
