import { FilterChip } from '../common/Chips';
import Button from '../common/Button';
import type { NeuralNode } from './graphDataAdapter';

interface Props {
  search: string; onSearch: (value: string) => void;
  language: string; onLanguage: (value: string) => void;
  nodes: NeuralNode[]; selected: string | null;
  onSelect: (id: string | null) => void; onReset: () => void;
}
export default function NeuralMapControls(p: Props) {
  const languages = [...new Set(['python', 'javascript', 'typescript', ...p.nodes.map(n => n.language)])];
  return <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-white/15 bg-white/5">
    <input type="text" aria-label="Search files" placeholder="Search files..." value={p.search}
      onChange={e => p.onSearch(e.target.value)} className="rounded-pill px-4 py-2 text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/60" />
    <div className="flex flex-wrap gap-1.5" aria-label="Filter by language">
      {['all', ...languages].map(language => <FilterChip key={language} label={language} active={p.language === language} onClick={() => p.onLanguage(language)} />)}
    </div>
    <Button variant="outline" size="sm" onClick={p.onReset}>Reset View</Button>
    <label className="text-xs text-white/70 ml-auto">Select file
      <select aria-label="Select file" className="ml-2 max-w-[200px] bg-surface text-ink rounded px-2 py-1" value={p.selected || ''} onChange={e => p.onSelect(e.target.value || null)}>
        <option value="">Choose a file</option>
        {p.nodes.filter(n => (!p.search || n.label.toLowerCase().includes(p.search.toLowerCase())) && (p.language === 'all' || n.language === p.language))
          .map(n => <option value={n.id} key={n.id}>{n.label}</option>)}
      </select>
    </label>
  </div>;
}
