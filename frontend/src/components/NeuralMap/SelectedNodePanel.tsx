import { useMemo, useState } from 'react';
import {
  X,
  Copy,
  Check,
  Flame,
  Network,
  GitFork,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import type { TabType } from '../../types';
import { LanguageTag } from '../common/Tags';
import RiskBadge from '../common/RiskBadge';
import Button from '../common/Button';
import type { NeuralNode } from './graphDataAdapter';

interface SelectedNodePanelProps {
  node: NeuralNode;
  allNodes: NeuralNode[];
  onClose: () => void;
  onSelectNode: (id: string) => void;
  onNavigate: (tab: TabType, file: string) => void;
  isPreviewingImpact?: boolean;
  onToggleImpactPreview?: () => void;
  onOpenPathTrace?: (sourceId: string) => void;
}

export default function SelectedNodePanel({
  node,
  allNodes,
  onClose,
  onSelectNode,
  onNavigate,
  isPreviewingImpact = false,
  onToggleImpactPreview,
  onOpenPathTrace,
}: SelectedNodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [showAllUpstream, setShowAllUpstream] = useState(false);
  const [showAllDownstream, setShowAllDownstream] = useState(false);

  const copyPath = () => {
    navigator.clipboard.writeText(node.label);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const nodeMap = useMemo(() => new Map(allNodes.map(n => [n.id, n])), [allNodes]);
  const upstreamNodes = node.upstreamIds
    .map(id => nodeMap.get(id))
    .filter((n): n is NeuralNode => Boolean(n));
  const downstreamNodes = node.downstreamIds
    .map(id => nodeMap.get(id))
    .filter((n): n is NeuralNode => Boolean(n));

  const roleDisplay = (node.role || 'module').replace(/_/g, ' ').toUpperCase();

  const parseBadgeColor =
    node.parseStatus === 'full'
      ? 'bg-teal-surface text-teal-text border-teal-line'
      : node.parseStatus === 'partial'
      ? 'bg-amber-surface text-amber-text border-amber-line'
      : 'bg-red-surface text-red-text border-red-line';

  const confBadgeColor =
    node.analysisConfidence === 'high'
      ? 'bg-tile text-ink-2 border-line'
      : node.analysisConfidence === 'medium'
      ? 'bg-amber-surface text-amber-text border-amber-line'
      : 'bg-red-surface text-red-text border-red-line';

  return (
    <aside
      aria-label="Selected node details"
      className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-1 space-y-4 max-h-[88vh] overflow-y-auto animate-[fade-up_200ms_ease-out]"
    >
      {/* 1. Header with Breadcrumbs & Close Button */}
      <div className="pb-3 border-b border-line flex justify-between items-start gap-2">
        <div className="min-w-0">
          {/* Breadcrumb path */}
          <div className="flex items-center gap-1 text-[11px] text-ink-3 font-mono mb-1.5 flex-wrap">
            <span>{node.clusterLabel}</span>
            <span>/</span>
            <span>{node.subCluster}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-panel text-ink-2 border border-line uppercase tracking-wider">
              {roleDisplay}
            </span>
            <LanguageTag language={node.language} />
            {node.isEntryPoint && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-surface text-teal-text border border-teal-line uppercase">
                ENTRY POINT
              </span>
            )}
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${parseBadgeColor}`}
            >
              {node.parseStatus} AST
            </span>
          </div>

          <h3
            className="text-sm font-bold text-ink mt-2 font-mono break-all leading-tight"
            title={node.label}
          >
            {node.label.split('/').pop()}
          </h3>
          <p className="text-[11px] text-ink-3 font-mono truncate mt-0.5" title={node.label}>
            {node.label}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-ink-3 hover:text-ink p-1 rounded-md hover:bg-tile transition-colors"
          title="Close details panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Mini Radial Connectivity Visualizer (Section 35) */}
      <div className="p-3 rounded-xl bg-tile border border-line space-y-2">
        <div className="flex items-center justify-between text-[11px] text-ink-2">
          <span className="font-bold font-mono uppercase tracking-wider text-[10px]">
            Connectivity Topology
          </span>
          <span className="text-ink-3 text-[10px] font-mono">
            {node.fanIn} In · {node.fanOut} Out · Blast {node.blastRadius}
          </span>
        </div>

        {/* Mini Radial Canvas / Schema */}
        <div className="py-2 flex flex-col items-center justify-center gap-1 text-center font-mono">
          {/* Upstream Caller Badges */}
          <div className="text-[10px] text-ink-3">
            ▲ UPSTREAM CALLERS ({upstreamNodes.length})
          </div>
          <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-full">
            {upstreamNodes.slice(0, 3).map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectNode(u.id)}
                className="px-1.5 py-0.5 rounded bg-surface border border-line text-[10px] text-ink-2 hover:border-indigo truncate max-w-[100px]"
                title={u.label}
              >
                {u.label.split('/').pop()}
              </button>
            ))}
            {upstreamNodes.length > 3 && (
              <span className="text-[10px] text-ink-3">+{upstreamNodes.length - 3}</span>
            )}
          </div>

          {/* Central Target Node Indicator */}
          <div className="my-1 px-3 py-1 rounded-full bg-indigo-surface border border-indigo/40 text-indigo font-bold text-xs shadow-xs">
            ◉ {node.label.split('/').pop()}
          </div>

          {/* Downstream Dependency Badges */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-full">
            {downstreamNodes.slice(0, 3).map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectNode(d.id)}
                className="px-1.5 py-0.5 rounded bg-surface border border-line text-[10px] text-ink-2 hover:border-indigo truncate max-w-[100px]"
                title={d.label}
              >
                {d.label.split('/').pop()}
              </button>
            ))}
            {downstreamNodes.length > 3 && (
              <span className="text-[10px] text-ink-3">+{downstreamNodes.length - 3}</span>
            )}
          </div>
          <div className="text-[10px] text-ink-3">
            ▼ DOWNSTREAM DEPENDENCIES ({downstreamNodes.length})
          </div>
        </div>
      </div>

      {/* 3. Core Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-tile border border-line">
          <span className="text-[10px] font-mono text-ink-3 uppercase block">Risk Score</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base font-bold font-mono text-ink">
              {node.hotspotScore ? `${node.hotspotScore}/100` : '—'}
            </span>
            <RiskBadge level={node.riskLevel as any} />
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-tile border border-line">
          <span className="text-[10px] font-mono text-ink-3 uppercase block">Complexity</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base font-bold font-mono text-ink">
              {node.complexityScore}
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface border border-line text-ink-2">
              {node.complexityRating}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-tile border border-line">
          <span className="text-[10px] font-mono text-ink-3 uppercase block">Lines of Code</span>
          <span className="text-base font-bold font-mono text-ink mt-1 block">
            {node.loc.toLocaleString()}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-tile border border-line">
          <span className="text-[10px] font-mono text-ink-3 uppercase block">AST Confidence</span>
          <span className={`text-[10px] font-mono font-bold mt-1 inline-block px-1.5 py-0.5 rounded border uppercase ${confBadgeColor}`}>
            {node.analysisConfidence} Confidence
          </span>
        </div>
      </div>

      {/* 4. Action Buttons (Section 34) */}
      <div className="space-y-2 pt-2 border-t border-line">
        {onToggleImpactPreview && (
          <Button
            variant={isPreviewingImpact ? 'dark' : 'indigo'}
            size="sm"
            onClick={onToggleImpactPreview}
            className="w-full justify-center text-xs"
            icon={<ShieldAlert className="w-3.5 h-3.5" />}
          >
            {isPreviewingImpact ? 'Stop Impact Preview' : 'What breaks if I change this?'}
          </Button>
        )}

        {onOpenPathTrace && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenPathTrace(node.id)}
            className="w-full justify-center text-xs"
            icon={<GitFork className="w-3.5 h-3.5" />}
          >
            Trace Path from here...
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('graph', node.label)}
            className="justify-center text-xs"
            icon={<Network className="w-3.5 h-3.5" />}
          >
            Dependency Map
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('hotspots', node.label)}
            className="justify-center text-xs"
            icon={<Flame className="w-3.5 h-3.5" />}
          >
            Risk Analysis
          </Button>
        </div>

        <button
          type="button"
          onClick={copyPath}
          className="w-full py-1.5 px-3 rounded-lg border border-line bg-tile hover:bg-panel text-ink-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Path Copied!' : 'Copy Module Path'}</span>
        </button>
      </div>

      {/* 5. Direct Dependencies Accordion */}
      <div className="pt-2 border-t border-line space-y-2.5">
        <div>
          <button
            type="button"
            onClick={() => setShowAllUpstream(v => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold text-ink hover:text-indigo py-1"
          >
            <span>Direct Callers ({upstreamNodes.length})</span>
            {showAllUpstream ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showAllUpstream && (
            <div className="mt-1 space-y-1 max-h-36 overflow-y-auto pr-1">
              {upstreamNodes.length === 0 ? (
                <p className="text-[11px] text-ink-3">No internal callers detected.</p>
              ) : (
                upstreamNodes.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onSelectNode(u.id)}
                    className="w-full text-left px-2 py-1 rounded bg-tile hover:bg-panel text-xs text-ink-2 truncate block transition-colors"
                  >
                    {u.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAllDownstream(v => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold text-ink hover:text-indigo py-1"
          >
            <span>Direct Dependencies ({downstreamNodes.length})</span>
            {showAllDownstream ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showAllDownstream && (
            <div className="mt-1 space-y-1 max-h-36 overflow-y-auto pr-1">
              {downstreamNodes.length === 0 ? (
                <p className="text-[11px] text-ink-3">No outgoing dependencies detected.</p>
              ) : (
                downstreamNodes.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onSelectNode(d.id)}
                    className="w-full text-left px-2 py-1 rounded bg-tile hover:bg-panel text-xs text-ink-2 truncate block transition-colors"
                  >
                    {d.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
