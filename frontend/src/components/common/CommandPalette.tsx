import React, { useEffect, useState, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  FolderPlus,
  BookOpen,
  Network,
  GitFork,
  ShieldCheck,
  Layers,
  TestTube,
  Wand2,
  Map,
  X,
  ArrowRight,
} from 'lucide-react';
import { ViewMode } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: ViewMode) => void;
  activeProjectName?: string;
}

interface CommandItem {
  id: string;
  label: string;
  category: 'Navigation' | 'Actions';
  icon: any;
  view?: ViewMode;
  shortcut?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectView,
  activeProjectName,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandItems: CommandItem[] = [
    { id: 'dash', label: 'Go to Dashboard', category: 'Navigation', icon: LayoutDashboard, view: 'dashboard', shortcut: 'G D' },
    { id: 'proj', label: 'Projects & Codebase Ingestion', category: 'Navigation', icon: FolderPlus, view: 'analyze', shortcut: 'G P' },
    { id: 'expl', label: 'Explanation & Codebase Insights', category: 'Navigation', icon: BookOpen, view: 'explanation', shortcut: 'G E' },
    { id: 'kg', label: 'Codebase Knowledge Graph Explorer', category: 'Navigation', icon: Network, view: 'knowledge_graph', shortcut: 'G K' },
    { id: 'deps', label: 'Dependency Graph Analysis', category: 'Navigation', icon: GitFork, view: 'graph', shortcut: 'G G' },
    { id: 'health', label: 'Dependency Health & Packages Audit', category: 'Navigation', icon: ShieldCheck, view: 'health', shortcut: 'G H' },
    { id: 'arch', label: 'Architecture Evolution Analysis', category: 'Navigation', icon: Layers, view: 'architecture', shortcut: 'G A' },
    { id: 'test', label: 'Generated Test Suite', category: 'Navigation', icon: TestTube, view: 'tests', shortcut: 'G T' },
    { id: 'ref', label: 'Refactoring & Code Modernization', category: 'Navigation', icon: Wand2, view: 'refactor', shortcut: 'G R' },
    { id: 'mig', label: 'Migration Plan & Readiness Score', category: 'Navigation', icon: Map, view: 'migration', shortcut: 'G M' },
  ];

  const filteredCommands = commandItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global Ctrl+K Shortcut Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open
          inputRef.current?.focus();
        }
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected && selected.view) {
          onSelectView(selected.view);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-[#181715] rounded-2xl border-2 border-[#3A3632] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="relative flex items-center px-4 border-b border-[#2D2A26] bg-[#23211E]">
          <Search className="w-4 h-4 text-[#C7953D] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search page (e.g. Knowledge Graph, Tests, Architecture)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent px-3 py-4 text-sm text-white placeholder-[#8C8275] focus:outline-none font-medium"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C8275] hover:text-white hover:bg-[#3A3632] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Context Banner */}
        {activeProjectName && (
          <div className="px-4 py-2 bg-[#2D2A26]/50 border-b border-[#3A3632] text-xs text-[#A3998E] flex items-center justify-between font-mono">
            <span>Target Project: <strong className="text-white">{activeProjectName}</strong></span>
            <span className="text-[10px] text-[#C7953D]">Use ↑ ↓ to navigate, Enter to select</span>
          </div>
        )}

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-[#8C8275] text-xs font-sans">
              No matching commands or pages found.
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.view) {
                      onSelectView(item.view);
                      onClose();
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                    isSelected ? 'bg-[#C7953D] text-[#181715] font-bold' : 'text-[#E5DFD5] hover:bg-[#23211E]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[#181715]' : 'text-[#C7953D]'}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.shortcut && (
                      <span className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                        isSelected ? 'bg-[#181715]/20 text-[#181715]' : 'bg-[#23211E] text-[#8C8275] border border-[#3A3632]'
                      }`}>
                        {item.shortcut}
                      </span>
                    )}
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-[#181715]' : 'text-[#8C8275]'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#23211E] border-t border-[#2D2A26] flex items-center justify-between text-[11px] text-[#8C8275] font-mono">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-[#181715] rounded border border-[#3A3632] text-white">Esc</kbd> close</span>
            <span><kbd className="px-1.5 py-0.5 bg-[#181715] rounded border border-[#3A3632] text-white">Ctrl+K</kbd> toggle</span>
          </div>
          <span>CodeOracle Command Palette</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
