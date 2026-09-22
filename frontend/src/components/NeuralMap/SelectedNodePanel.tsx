import { useMemo, useState } from 'react';
import {
  X,
  Copy,
  Check,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Flame,
  Network,
  Wand2,
  TestTube,
  GitFork,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import type { TabType } from '../../types';
import { LanguageTag } from '../common/Tags';
import RiskBadge from '../common/RiskBadge';
import Button from '../common/Button';
import type { NeuralNode } from './graphDataAdapter';
import { truncateMiddle } from '../../utils/formatters';

interface SelectedNodePanelProps {
  node: NeuralNode;
  allNodes: NeuralNode[];
  onClose: () => void;
  onSelectNode: (id: string) => void;
  onNavigate: (tab: TabType, file: string) => void;
  isPreviewingImpact?: boolean;
  onToggleImpactPreview?: () => void;
}

export default function SelectedNodePanel({
  node,
  allNodes,
  onClose,
  onSelectNode,
  onNavigate,
  isPreviewingImpact = false,
  onToggleImpactPreview,
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

  // Compute relationship trail backwards to entry point or root
  const relationshipTrail = useMemo(() => {
    const trail: NeuralNode[] = [node];
    const visited = new Set<string>([node.id]);
    let curr = node;

    for (let depth = 0; depth < 4; depth++) {
      if (!curr.upstreamIds || curr.upstreamIds.length === 0) break;
      // Prefer an entry point upstream if available
      const upNodes = curr.upstreamIds
        .map(id => nodeMap.get(id))
        .filter((n): n is NeuralNode => n !== undefined && !visited.has(n.id));
      if (upNodes.length === 0) break;
      const nextNode = upNodes.find(n => n.isEntryPoint) || upNodes[0];
      trail.unshift(nextNode);
      visited.add(nextNode.id);
      curr = nextNode;
      if (nextNode.isEntryPoint) break;
    }
    return trail;
  }, [node, nodeMap]);

  // Natural language architectural interpretation
  let interpretation = '';
  if (node.nodeState === 'true_standalone') {
    interpretation = 'This module is a true standalone file with no callers or downstream dependencies.';
  } else if (node.nodeState === 'unresolved') {
    interpretation = `This module has ${node.unresolvedImports} unresolved import(s). Some outgoing dependencies may be missing from the graph.`;
  } else if (node.parseStatus === 'partial') {
    interpretation = `This module is called by ${node.fanIn} internal module(s). Its outgoing dependencies may be incomplete because parsing was partial.`;
  } else if (node.isEntryPoint) {
    interpretation = `This module is an architectural entry point (${node.entryPointKind || 'runtime'}) with ${node.fanOut} downstream dependencies.`;
  } else if (node.inCycle) {
    interpretation = `This module is a member of a cyclic dependency loop. Decoupling is recommended before safe refactoring.`;
  } else if (node.fanIn > 0 && node.fanOut > 0) {
    interpretation = `This module acts as an architectural hub, connecting ${node.fanIn} upstream caller(s) to ${node.fanOut} downstream dependencies.`;
  } else if (node.fanIn > 0) {
    interpretation = `This module is a leaf dependency called by ${node.fanIn} internal module(s).`;
  } else {
    interpretation = `This module calls ${node.fanOut} internal dependencies.`;
  }

  // Canonical score factor decomposition from RiskAssessment
  const factors = node.hotspot?.scoreFactors || (node.hotspot as any)?.score_factors;
  const compContribution = factors?.complexity ?? 0;
  const warnContribution = factors?.warnings ?? 0;
  const fanInContribution = factors?.fanIn ?? factors?.fan_in ?? 0;
  const blastContribution = factors?.blastRadius ?? factors?.blast_radius ?? 0;
  const locContribution = factors?.loc ?? 0;

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

  // Proportional incoming vs outgoing relationship bar calculation
  const totalDegree = Math.max(1, node.fanIn + node.fanOut);
  const incomingPct = Math.round((node.fanIn / totalDegree) * 100);
  const outgoingPct = Math.round((node.fanOut / totalDegree) * 100);

  return (
    <aside
      aria-label="Selected node details"
      className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-1 space-y-4 max-h-[88vh] overflow-y-auto animate-[fade-up_200ms_ease-out]"
    >
      {/* Header with Title and Close button */}
      <div className="pb-3 border-b border-line flex justify-between items-start gap-2">
        <div className="min-w-0">
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
            {node.inCycle && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-surface text-red-text border border-red-line uppercase">
                CYCLE
              </span>
            )}
          </div>
          <h3
            className="font-mono font-bold text-sm text-ink break-all mt-1.5"
            title={node.label}
          >
            {node.label.split(/[\\/]/).pop()}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-ink-3">
            <span className="truncate max-w-[200px]" title={node.label}>
              {truncateMiddle(node.label, 26)}
            </span>
            <button
              onClick={copyPath}
              className="p-1 hover:bg-tile rounded text-ink-3 hover:text-ink transition-colors"
              title="Copy full path"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <button
          aria-label="Close selected node"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-tile text-ink-3 hover:text-ink transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Relationship Trail Breadcrumb */}
      {relationshipTrail.length > 1 && (
        <div className="p-2.5 rounded-lg bg-tile/50 border border-line text-[11px] space-y-1">
          <span className="text-[10px] font-bold text-ink-3 uppercase block">RELATIONSHIP TRAIL</span>
          <div className="flex items-center gap-1 flex-wrap font-mono">
            {relationshipTrail.map((t, idx) => (
              <span key={t.id} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight className="w-3 h-3 text-ink-4 shrink-0" />}
                <button
                  onClick={() => onSelectNode(t.id)}
                  className={`hover:underline truncate max-w-[110px] ${
                    t.id === node.id ? 'font-bold text-indigo' : 'text-ink-2 hover:text-ink'
                  }`}
                  title={t.label}
                >
                  {t.label.split(/[\\/]/).pop()}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hotspot Score Linear Visual Bar */}
      <div className="p-3 rounded-lg border border-line bg-tile/40 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-ink-2 uppercase flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber" />
            Hotspot Score
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-ink">{node.hotspotScore} / 100</span>
            <RiskBadge level={node.riskLevel} size="sm" />
          </div>
        </div>
        <div className="w-full bg-line rounded-full h-2 overflow-hidden flex">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              node.hotspotScore >= 70
                ? 'bg-red'
                : node.hotspotScore >= 45
                ? 'bg-amber'
                : node.hotspotScore >= 20
                ? 'bg-amber-400'
                : 'bg-teal'
            }`}
            style={{ width: `${Math.max(4, node.hotspotScore)}%` }}
          />
        </div>
      </div>

      {/* Parse & Confidence Visual Indicators */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-lg border border-line bg-tile/40 space-y-1">
          <span className="text-[10px] font-bold text-ink-3 uppercase block">PARSE STATUS</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${parseBadgeColor}`}>
            {node.parseStatus.toUpperCase()}
          </span>
          {node.parseReason && (
            <p className="text-[11px] text-ink-3 leading-tight break-words" title={node.parseReason}>
              {node.parseReason}
            </p>
          )}
        </div>

        <div className="p-2.5 rounded-lg border border-line bg-tile/40 space-y-1">
          <span className="text-[10px] font-bold text-ink-3 uppercase block">CONFIDENCE</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${confBadgeColor}`}>
            {node.analysisConfidence.toUpperCase()}
          </span>
          <p className="text-[11px] text-ink-3 leading-tight">
            {node.nodeState === 'true_standalone'
              ? 'Verified standalone'
              : node.nodeState === 'unresolved'
              ? 'Incomplete graph'
              : 'AST verified'}
          </p>
        </div>
      </div>

      {/* Incoming vs Outgoing Coupling Direction Bar */}
      <div className="p-3 rounded-lg border border-line bg-tile/40 space-y-2 text-xs">
        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-ink-3">
          <span className="flex items-center gap-1 text-teal-strong">
            <ArrowDownLeft className="w-3 h-3" /> Incoming {node.fanIn}
          </span>
          <span className="text-ink-2">COUPLING BALANCE</span>
          <span className="flex items-center gap-1 text-indigo-text">
            Outgoing {node.fanOut} <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
        <div className="w-full bg-line rounded-full h-2 overflow-hidden flex gap-0.5">
          <div
            className="h-full bg-teal transition-all duration-300"
            style={{ width: `${incomingPct}%` }}
            title={`Incoming Callers: ${node.fanIn}`}
          />
          <div
            className="h-full bg-indigo transition-all duration-300"
            style={{ width: `${outgoingPct}%` }}
            title={`Outgoing Dependencies: ${node.fanOut}`}
          />
        </div>
      </div>

      {/* Architectural Interpretation Note */}
      <div className="p-3 rounded-lg bg-indigo-surface/30 border border-indigo/20 text-xs text-ink leading-relaxed">
        <strong className="text-indigo font-semibold block mb-0.5">Architectural Role:</strong>
        {interpretation}
      </div>

      {/* Canonical Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 bg-tile/60 border border-line rounded-lg p-3 text-xs">
        <div>
          <span className="text-ink-3 text-[10px] uppercase font-bold block">COMPLEXITY</span>
          <span className="font-mono text-xs font-bold text-ink mt-0.5 block">
            {node.complexityScore} CC ({node.complexityRating.toUpperCase()})
          </span>
        </div>

        <div>
          <span className="text-ink-3 text-[10px] uppercase font-bold block">LINES OF CODE</span>
          <span className="font-mono text-xs font-bold text-ink mt-0.5 block">{node.loc} LOC</span>
        </div>

        <div>
          <span className="text-ink-3 text-[10px] uppercase font-bold block">BLAST RADIUS</span>
          <span className="font-mono text-xs font-bold text-ink mt-0.5 block">{node.blastRadius} files</span>
        </div>

        <div>
          <span className="text-ink-3 text-[10px] uppercase font-bold block">IMPORTANCE</span>
          <span className="font-mono text-xs font-bold text-ink mt-0.5 block">
            {Math.round(node.visualImportance * 100)}%
          </span>
        </div>
      </div>

      {/* Unresolved details banner if any */}
      {node.unresolvedDetails && node.unresolvedDetails.length > 0 && (
        <div className="p-3 bg-amber-surface/40 border border-amber-line rounded-lg space-y-1 text-xs">
          <div className="flex items-center gap-1 text-amber-text font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Unresolved Imports ({node.unresolvedDetails.length})</span>
          </div>
          <div className="space-y-1 font-mono text-[11px] pt-1 max-h-24 overflow-y-auto">
            {node.unresolvedDetails.map((u, i) => (
              <div key={i} className="text-ink-2 truncate" title={`${u.rawImport} (${u.reason})`}>
                <span className="text-amber-text">•</span> {u.rawImport} <span className="text-ink-4">L{u.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Explanation: "Why this score?" */}
      <div className="p-3 rounded-lg border border-line bg-tile/40 space-y-2 text-xs">
        <div className="flex justify-between items-center border-b border-line pb-1.5">
          <span className="text-[11px] font-bold uppercase text-ink-2 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber" />
            Why This Score?
          </span>
          <span className="font-mono font-bold text-amber-strong">
            {node.hotspotScore} / 100
          </span>
        </div>
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between text-ink-2">
            <span>Complexity</span>
            <span className="font-bold text-ink">+{compContribution} pts</span>
          </div>
          <div className="flex justify-between text-ink-2">
            <span>Modernization Warnings</span>
            <span className="font-bold text-ink">+{warnContribution} pts</span>
          </div>
          <div className="flex justify-between text-ink-2">
            <span>Fan-In Callers</span>
            <span className="font-bold text-ink">+{fanInContribution} pts</span>
          </div>
          <div className="flex justify-between text-ink-2">
            <span>Blast Radius</span>
            <span className="font-bold text-ink">+{blastContribution} pts</span>
          </div>
          <div className="flex justify-between text-ink-2">
            <span>Lines of Code</span>
            <span className="font-bold text-ink">+{locContribution} pts</span>
          </div>
        </div>
      </div>

      {/* Upstream Callers List */}
      <div className="border border-line rounded-lg p-3 space-y-2 bg-surface">
        <div className="flex justify-between items-center text-xs font-bold text-ink-2">
          <span className="flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-teal" />
            UPSTREAM CALLERS ({upstreamNodes.length})
          </span>
        </div>
        {upstreamNodes.length === 0 ? (
          <p className="text-[11px] text-ink-4 italic">No incoming callers</p>
        ) : (
          <div className="space-y-1">
            {(showAllUpstream ? upstreamNodes : upstreamNodes.slice(0, 5)).map(u => (
              <button
                key={u.id}
                onClick={() => onSelectNode(u.id)}
                className="w-full text-left p-1.5 rounded hover:bg-tile text-[11px] font-mono text-ink flex items-center justify-between group transition-colors"
                title={`Select ${u.label}`}
              >
                <span className="truncate group-hover:text-indigo">{u.label.split(/[\\/]/).pop()}</span>
                <span className="text-[10px] text-ink-4 shrink-0 font-sans">select</span>
              </button>
            ))}
            {upstreamNodes.length > 5 && (
              <button
                onClick={() => setShowAllUpstream(!showAllUpstream)}
                className="text-[11px] text-indigo font-semibold hover:underline flex items-center gap-1 pt-1"
              >
                {showAllUpstream ? 'Show less' : `Show all ${upstreamNodes.length}`}
                {showAllUpstream ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Downstream Dependencies List */}
      <div className="border border-line rounded-lg p-3 space-y-2 bg-surface">
        <div className="flex justify-between items-center text-xs font-bold text-ink-2">
          <span className="flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo" />
            DOWNSTREAM DEPENDENCIES ({downstreamNodes.length})
          </span>
        </div>
        {downstreamNodes.length === 0 ? (
          <p className="text-[11px] text-ink-4 italic">No outgoing dependencies</p>
        ) : (
          <div className="space-y-1">
            {(showAllDownstream ? downstreamNodes : downstreamNodes.slice(0, 5)).map(d => (
              <button
                key={d.id}
                onClick={() => onSelectNode(d.id)}
                className="w-full text-left p-1.5 rounded hover:bg-tile text-[11px] font-mono text-ink flex items-center justify-between group transition-colors"
                title={`Select ${d.label}`}
              >
                <span className="truncate group-hover:text-indigo">{d.label.split(/[\\/]/).pop()}</span>
                <span className="text-[10px] text-ink-4 shrink-0 font-sans">select</span>
              </button>
            ))}
            {downstreamNodes.length > 5 && (
              <button
                onClick={() => setShowAllDownstream(!showAllDownstream)}
                className="text-[11px] text-indigo font-semibold hover:underline flex items-center gap-1 pt-1"
              >
                {showAllDownstream ? 'Show less' : `Show all ${downstreamNodes.length}`}
                {showAllDownstream ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Impact Preview & Cross-Page Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-line">
        <span className="text-[10px] font-bold uppercase text-ink-3 tracking-wider block">
          INTERACTIVE ACTIONS
        </span>

        {onToggleImpactPreview && (
          <Button
            variant={isPreviewingImpact ? 'indigo' : 'outline'}
            size="sm"
            className="w-full justify-start text-xs font-semibold"
            icon={<ShieldAlert className="w-3.5 h-3.5 text-amber" />}
            onClick={onToggleImpactPreview}
          >
            {isPreviewingImpact ? 'Hide Impact Blast Radius' : 'Preview Impact Blast Radius'}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          icon={<GitFork className="w-3.5 h-3.5 text-teal" />}
          onClick={() => onNavigate('migration', node.label)}
        >
          Analyze Impact
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          icon={<Network className="w-3.5 h-3.5 text-indigo" />}
          onClick={() => onNavigate('graph', node.label)}
        >
          Inspect in Dependency Map
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          icon={<Flame className="w-3.5 h-3.5 text-amber" />}
          onClick={() => onNavigate('hotspots', node.label)}
        >
          View in Risk Hotspots
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          icon={<TestTube className="w-3.5 h-3.5 text-teal" />}
          onClick={() => onNavigate('tests', node.label)}
        >
          Generate Safety Tests
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          icon={<Wand2 className="w-3.5 h-3.5 text-indigo" />}
          onClick={() => onNavigate('refactor', node.label)}
        >
          Review Modernization
        </Button>
      </div>
    </aside>
  );
}
