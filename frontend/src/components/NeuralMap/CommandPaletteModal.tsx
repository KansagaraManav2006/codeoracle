import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Compass,
  Zap,
  ShieldAlert,
  Flame,
  FileCode2,
  Maximize2,
  Workflow,
  Sparkles,
  GitFork,
  X,
  Layers,
} from 'lucide-react';
import type { DensityLevel, NeuralNode, VisualMode } from './graphDataAdapter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nodes: NeuralNode[];
  onSelectNode: (id: string) => void;
  onVisualMode: (mode: VisualMode) => void;
  onDensity: (density: DensityLevel) => void;
  onFit: () => void;
  onStartTour: () => void;
  onOpenPathTrace: () => void;
}

interface PaletteCommand {
  id: string;
  category: 'MODE' | 'ACTION' | 'FILE' | 'FILTER';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function CommandPaletteModal({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
  onVisualMode,
  onFit,
  onStartTour,
  onOpenPathTrace,
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const staticCmds: PaletteCommand[] = [
      {
        id: 'mode-structure',
        category: 'MODE',
        title: 'Switch to Structure Mode',
        subtitle: 'Subsystem constellations, role shapes, and dependency hierarchy',
        icon: <Layers className="w-4 h-4 text-sky-400" />,
        action: () => {
          onVisualMode('structure');
          onClose();
        },
      },
      {
        id: 'mode-flow',
        category: 'MODE',
        title: 'Switch to Signal Flow Mode',
        subtitle: 'Directional execution pipeline from entry points to database/ML',
        icon: <Zap className="w-4 h-4 text-amber-400" />,
        action: () => {
          onVisualMode('flow');
          onClose();
        },
      },
      {
        id: 'mode-risk',
        category: 'MODE',
        title: 'Switch to Risk Mode',
        subtitle: 'Prominent energy halos highlighting hotspots while keeping layout stable',
        icon: <Flame className="w-4 h-4 text-red-400" />,
        action: () => {
          onVisualMode('risk');
          onClose();
        },
      },
      {
        id: 'mode-impact',
        category: 'MODE',
        title: 'Switch to Impact Mode',
        subtitle: 'Visualize blast radius ripples and affected entry points',
        icon: <ShieldAlert className="w-4 h-4 text-orange-400" />,
        action: () => {
          onVisualMode('impact');
          onClose();
        },
      },
      {
        id: 'mode-parse',
        category: 'MODE',
        title: 'Switch to Parse Quality Mode',
        subtitle: 'AST extraction fidelity (Full, Partial, Fallback, Failed)',
        icon: <FileCode2 className="w-4 h-4 text-teal-400" />,
        action: () => {
          onVisualMode('parse_quality');
          onClose();
        },
      },
      {
        id: 'mode-entry',
        category: 'MODE',
        title: 'Switch to Entry Points Mode',
        subtitle: 'Trace execution trees starting from true application entry roots',
        icon: <Workflow className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onVisualMode('entry_points');
          onClose();
        },
      },
      {
        id: 'mode-system',
        category: 'MODE',
        title: 'Switch to System Architecture Mode',
        subtitle: 'High-level aggregate subsystem spheres with cross-layer conduits',
        icon: <Compass className="w-4 h-4 text-indigo-400" />,
        action: () => {
          onVisualMode('system');
          onClose();
        },
      },
      {
        id: 'action-tour',
        category: 'ACTION',
        title: 'Start Architecture Tour',
        subtitle: 'Guided 5-step cinematic walkthrough of repository architecture',
        icon: <Sparkles className="w-4 h-4 text-yellow-300" />,
        action: () => {
          onClose();
          onStartTour();
        },
      },
      {
        id: 'action-trace',
        category: 'ACTION',
        title: 'Trace Dependency Path...',
        subtitle: 'Find shortest dependency path between any two modules in universe',
        icon: <GitFork className="w-4 h-4 text-cyan-400" />,
        action: () => {
          onClose();
          onOpenPathTrace();
        },
      },
      {
        id: 'action-fit',
        category: 'ACTION',
        title: 'Fit Architecture Universe',
        subtitle: 'Reset camera and frame all constellations in viewport',
        icon: <Maximize2 className="w-4 h-4 text-gray-300" />,
        action: () => {
          onFit();
          onClose();
        },
      },
    ];

    if (!query) return staticCmds;

    const q = query.toLowerCase();
    const matchingStatic = staticCmds.filter(
      c => c.title.toLowerCase().includes(q) || (c.subtitle && c.subtitle.toLowerCase().includes(q))
    );

    const matchingFiles: PaletteCommand[] = nodes
      .filter(n => n.label.toLowerCase().includes(q))
      .slice(0, 8)
      .map(n => ({
        id: `node-${n.id}`,
        category: 'FILE',
        title: n.label.split('/').pop() || n.label,
        subtitle: `${n.clusterLabel} · ${n.role} · Risk: ${String(n.riskLevel).toUpperCase()} · ${n.label}`,
        icon: <FileCode2 className="w-4 h-4 text-indigo-300" />,
        action: () => {
          onSelectNode(n.id);
          onClose();
        },
      }));

    return [...matchingStatic, ...matchingFiles];
  }, [nodes, query, onVisualMode, onFit, onStartTour, onOpenPathTrace, onSelectNode, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % Math.max(1, commands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + commands.length) % Math.max(1, commands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (commands[selectedIndex]) {
          commands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, commands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/65 backdrop-blur-sm animate-[fade-in_150ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#091422] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-white/5">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search file in universe..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="overflow-y-auto p-2 space-y-1 divide-y divide-white/5">
          {commands.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/50">
              No matching commands or files found for &quot;{query}&quot;
            </div>
          ) : (
            commands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 text-white border border-cyan-400/30'
                      : 'text-white/80 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-cyan-500/30 text-white' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {cmd.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold truncate">{cmd.title}</span>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          cmd.category === 'MODE'
                            ? 'bg-indigo-500/30 text-indigo-200'
                            : cmd.category === 'ACTION'
                            ? 'bg-amber-500/30 text-amber-200'
                            : 'bg-emerald-500/30 text-emerald-200'
                        }`}
                      >
                        {cmd.category}
                      </span>
                    </div>
                    {cmd.subtitle && (
                      <p className="text-[11px] text-white/50 truncate mt-0.5">{cmd.subtitle}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-black/20 text-[10px] text-white/40 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
