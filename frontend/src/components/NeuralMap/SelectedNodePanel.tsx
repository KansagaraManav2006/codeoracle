import { X } from 'lucide-react';
import type { TabType } from '../../types';
import { LanguageTag } from '../common/Tags';
import RiskBadge from '../common/RiskBadge';
import Button from '../common/Button';
import type { NeuralNode } from './graphDataAdapter';

// Mirrors Dependency Map's embedded 310px SELECTED NODE panel without changing that renderer.
export default function SelectedNodePanel({ node, onClose, onNavigate }: {
  node: NeuralNode; onClose: () => void; onNavigate: (tab: TabType, file: string) => void;
}) {
  const actions: [TabType, string][] = [['graph', 'Inspect in Dependency Map'], ['hotspots', 'View in Risk Hotspots'],
    ['tests', 'Generate Safety Tests'], ['refactor', 'Review Modernization']];
  return <aside aria-label="Selected node" className="bg-surface border border-line rounded-lg p-5 shadow-1 space-y-4 animate-[fade-up_200ms_ease-out]">
    <div className="pb-3 border-b border-line flex justify-between items-center">
      <span className="text-[11px] font-bold text-ink-2 tracking-wider">SELECTED NODE</span>
      <button aria-label="Close selected node" onClick={onClose} className="p-1 rounded hover:bg-tile"><X className="w-4 h-4" /></button>
    </div>
    <div><h3 className="font-mono font-bold text-sm text-ink break-all">{node.label.split(/[\\/]/).pop()}</h3>
      <p className="text-xs text-ink-3 break-all mt-1">{node.label}</p></div>
    <LanguageTag language={node.language} />
    <dl className="bg-tile border border-line rounded-md p-3 text-xs space-y-3">
      <div className="flex justify-between"><dt>Lines of code</dt><dd>{node.loc}</dd></div>
      <div className="flex justify-between items-center"><dt>Risk level</dt><dd><RiskBadge level={node.riskLevel} size="sm" /></dd></div>
      <div className="flex justify-between"><dt>Fan-in / fan-out</dt><dd>{node.fanIn} / {node.fanOut}</dd></div>
    </dl>
    {node.hotspot && <p className="text-xs text-ink-2">Hotspot {node.hotspot.hotspot_score}/100 · {node.hotspot.reason}</p>}
    <div className="space-y-2">{actions.map(([tab, label]) => <Button key={tab} variant="outline" size="sm" className="w-full justify-center" onClick={() => onNavigate(tab, node.label)}>{label}</Button>)}</div>
  </aside>;
}
