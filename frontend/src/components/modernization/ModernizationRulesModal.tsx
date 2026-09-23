import React, { useState, useMemo } from 'react';
import { X, Search, Sparkles } from 'lucide-react';
import { ModernizationRule } from '../../types';
import Button from '../common/Button';

interface ModernizationRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: ModernizationRule[];
}

export const ModernizationRulesModal: React.FC<ModernizationRulesModalProps> = ({
  isOpen,
  onClose,
  rules,
}) => {
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState<'all' | 'python' | 'javascript'>('all');

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchesLang = langFilter === 'all' || r.language.toLowerCase() === langFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
      return matchesLang && matchesSearch;
    });
  }, [rules, search, langFilter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-[fade-in_150ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-registry-title"
    >
      <div className="bg-surface border border-line rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-[scale-up_150ms_ease-out]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between gap-3 bg-tile">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-surface text-teal-strong flex items-center justify-center border border-teal/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="rules-registry-title" className="font-display font-bold text-base text-ink">
                Deterministic Modernization Rule Registry
              </h3>
              <p className="font-sans text-xs text-ink-3">
                Auditable catalog of deterministic transformation rules supported by the refactoring engine.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close rule registry"
            className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-surface border border-transparent hover:border-line transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-3 sm:px-5 border-b border-line/60 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rule ID or description…"
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-tile border border-line text-xs font-sans text-ink placeholder:text-ink-4 focus:outline-none focus:ring-1 focus:ring-indigo"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-sans">
            <span className="text-ink-3 text-[11px] font-bold uppercase tracking-wider mr-1">
              Language:
            </span>
            {(['all', 'python', 'javascript'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLangFilter(lang)}
                className={`px-2.5 py-1 rounded-pill font-mono text-[11px] font-semibold border transition-all ${
                  langFilter === lang
                    ? 'bg-indigo text-white border-indigo shadow-xs'
                    : 'bg-tile text-ink-2 border-line hover:bg-surface'
                }`}
              >
                {lang === 'all' ? 'All' : lang === 'python' ? 'Python' : 'JS / TS'}
              </button>
            ))}
          </div>
        </div>

        {/* Rule list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 divide-y divide-line/50 space-y-3">
          {filteredRules.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-3 space-y-2">
              <p>No modernization rules matched your query.</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setLangFilter('all'); }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            filteredRules.map((rule) => (
              <div key={rule.id} className="pt-3 first:pt-0 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo px-2 py-0.5 rounded bg-indigo-surface border border-indigo/20">
                      {rule.id}
                    </span>
                    <span className="font-sans font-bold text-sm text-ink">
                      {rule.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-tile text-ink-2 border border-line uppercase">
                      {rule.language}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase border ${
                        rule.deterministic
                          ? 'bg-teal-surface text-teal-strong border-teal/30'
                          : 'bg-amber-surface text-amber-strong border-amber/30'
                      }`}
                    >
                      {rule.deterministic ? 'DETERMINISTIC' : 'MANUAL REVIEW'}
                    </span>
                    {rule.requiresProtection && (
                      <span className="px-2 py-0.5 rounded bg-tile text-ink-3 border border-line">
                        Requires Tests
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-ink-2 leading-relaxed">
                  {rule.description}
                </p>

                {rule.exampleBefore && rule.exampleAfter && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                    <div className="p-2 rounded bg-red-surface/30 border border-red-line/40 text-ink">
                      <div className="text-[10px] font-bold uppercase text-red-text mb-0.5">
                        Before (Legacy)
                      </div>
                      <code className="text-red-text">{rule.exampleBefore}</code>
                    </div>
                    <div className="p-2 rounded bg-teal-surface/30 border border-teal/40 text-ink">
                      <div className="text-[10px] font-bold uppercase text-teal-strong mb-0.5">
                        After (Modernized)
                      </div>
                      <code className="text-teal-strong">{rule.exampleAfter}</code>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 border-t border-line bg-tile flex items-center justify-between text-xs text-ink-3">
          <span>{filteredRules.length} rule(s) registered</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModernizationRulesModal;
